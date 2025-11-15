// src/firebaseUtils.ts
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { db } from './firebase';
import { getStorage } from 'firebase/storage';

const storage = getStorage();

// Types
export interface ExamData {
  id?: string;
  patientName: string;
  patientId: string;
  limb: string;
  location: string;
  therapistName: string;
  dateTime: string;
}

export interface PointData {
  id?: string;
  examId?: string;
  stumpPosition: { x: number; y: number; z: number };
  limbPosition: { x: number; y: number; z: number } | null;
  stimulationType: string;
  program: string;
  frequency: string;
  sensation: string;
  imageUrl: string | null;
}

// ============= EXAM FUNCTIONS =============

/**
 * Create a new examination
 */
export const createExam = async (examData: Omit<ExamData, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'examinations'), {
      ...examData,
      createdAt: Timestamp.now()
    });
    console.log('Exam created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating exam:', error);
    throw error;
  }
};

/**
 * Load an existing examination by patient name and ID
 */
export const loadExam = async (
  patientName: string, 
  patientId: string
): Promise<ExamData | null> => {
  try {
    const q = query(
      collection(db, 'examinations'),
      where('patientName', '==', patientName),
      where('patientId', '==', patientId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No exam found for this patient');
      return null;
    }
    
    // Return the most recent exam
    const exams = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExamData));
    
    // Sort by dateTime descending
    exams.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    
    return exams[0];
  } catch (error) {
    console.error('Error loading exam:', error);
    throw error;
  }
};

/**
 * Get all exams for a patient (by patientId)
 */
export const getPatientExams = async (patientId: string): Promise<ExamData[]> => {
  try {
    const q = query(
      collection(db, 'examinations'),
      where('patientId', '==', patientId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExamData));
  } catch (error) {
    console.error('Error getting patient exams:', error);
    throw error;
  }
};

/**
 * Update an examination
 */
export const updateExam = async (
  examId: string, 
  updates: Partial<ExamData>
): Promise<void> => {
  try {
    const examRef = doc(db, 'examinations', examId);
    await updateDoc(examRef, updates);
    console.log('Exam updated successfully');
  } catch (error) {
    console.error('Error updating exam:', error);
    throw error;
  }
};

// ============= POINT FUNCTIONS =============

/**
 * Create a new point for an examination
 */
export const createPoint = async (
  examId: string,
  pointData: Omit<PointData, 'id' | 'examId'>
): Promise<string> => {
  try {
    console.log('createPoint called with:', { examId, pointData });
    
    // Ensure positions are plain objects, not THREE.Vector3
    const cleanData = {
      stumpPosition: pointData.stumpPosition ? {
        x: Number(pointData.stumpPosition.x),
        y: Number(pointData.stumpPosition.y),
        z: Number(pointData.stumpPosition.z)
      } : null,
      limbPosition: pointData.limbPosition ? {
        x: Number(pointData.limbPosition.x),
        y: Number(pointData.limbPosition.y),
        z: Number(pointData.limbPosition.z)
      } : null,
      stimulationType: pointData.stimulationType || '',
      program: pointData.program || '',
      frequency: pointData.frequency || '',
      sensation: pointData.sensation || '',
      imageUrl: pointData.imageUrl || null,
      createdAt: Timestamp.now()
    };
    
    console.log('Cleaned data for Firebase:', cleanData);
    
    const docRef = await addDoc(
      collection(db, 'examinations', examId, 'points'),
      cleanData
    );
    console.log('✅ Point created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating point:', error);
    throw error;
  }
};

/**
 * Get all points for an examination
 */
export const getExamPoints = async (examId: string): Promise<PointData[]> => {
  try {
    const querySnapshot = await getDocs(
      collection(db, 'examinations', examId, 'points')
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      examId,
      ...doc.data()
    } as PointData));
  } catch (error) {
    console.error('Error getting points:', error);
    throw error;
  }
};

/**
 * Update a point
 */
export const updatePoint = async (
  examId: string,
  pointId: string,
  updates: Partial<PointData>
): Promise<void> => {
  try {
    const pointRef = doc(db, 'examinations', examId, 'points', pointId);
    await updateDoc(pointRef, updates);
    console.log('Point updated successfully');
  } catch (error) {
    console.error('Error updating point:', error);
    throw error;
  }
};

/**
 * Delete a point
 */
export const deletePoint = async (
  examId: string,
  pointId: string
): Promise<void> => {
  try {
    // First, get the point to check if it has an image
    const pointRef = doc(db, 'examinations', examId, 'points', pointId);
    const pointDoc = await getDoc(pointRef);
    
    if (pointDoc.exists()) {
      const pointData = pointDoc.data() as PointData;
      
      // Delete image from storage if it exists
      if (pointData.imageUrl) {
        await deletePointImage(examId, pointId);
      }
    }
    
    // Delete the point document
    await deleteDoc(pointRef);
    console.log('Point deleted successfully');
  } catch (error) {
    console.error('Error deleting point:', error);
    throw error;
  }
};

// ============= IMAGE FUNCTIONS =============

/**
 * Upload an image for a point
 */
export const uploadPointImage = async (
  examId: string,
  pointId: string,
  imageDataUrl: string
): Promise<string> => {
  try {
    const imageRef = ref(storage, `images/${examId}/${pointId}.jpg`);
    await uploadString(imageRef, imageDataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(imageRef);
    
    console.log('Image uploaded successfully');
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete an image for a point
 */
export const deletePointImage = async (
  examId: string,
  pointId: string
): Promise<void> => {
  try {
    const imageRef = ref(storage, `images/${examId}/${pointId}.jpg`);
    await deleteObject(imageRef);
    console.log('Image deleted successfully');
  } catch (error) {
    // Image might not exist, that's okay
    console.warn('Error deleting image (might not exist):', error);
  }
};

/**
 * Complete workflow: Save point with image
 */
export const savePointWithImage = async (
  examId: string,
  pointData: Omit<PointData, 'id' | 'examId' | 'imageUrl'>,
  imageDataUrl: string | null
): Promise<string> => {
  try {
    // First create the point without image
    const pointId = await createPoint(examId, {
      ...pointData,
      imageUrl: null
    });
    
    // If there's an image, upload it and update the point
    if (imageDataUrl) {
      const imageUrl = await uploadPointImage(examId, pointId, imageDataUrl);
      await updatePoint(examId, pointId, { imageUrl });
    }
    
    return pointId;
  } catch (error) {
    console.error('Error saving point with image:', error);
    throw error;
  }
};

/**
 * Update point with new image
 */
export const updatePointWithImage = async (
  examId: string,
  pointId: string,
  pointData: Partial<PointData>,
  imageDataUrl: string | null
): Promise<void> => {
  try {
    // If there's a new image, upload it
    let imageUrl = pointData.imageUrl;
    if (imageDataUrl) {
      // Delete old image if it exists
      await deletePointImage(examId, pointId);
      // Upload new image
      imageUrl = await uploadPointImage(examId, pointId, imageDataUrl);
    }
    
    // Update the point
    await updatePoint(examId, pointId, {
      ...pointData,
      imageUrl
    });
  } catch (error) {
    console.error('Error updating point with image:', error);
    throw error;
  }
};
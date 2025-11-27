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
  deleteObject,
  getStorage
} from 'firebase/storage';
import { db } from './firebase';

// Types
export interface ExamData {
  id?: string;
  patientName: string;
  patientId: string;
  limb: string;
  location: string;
  therapistName: string;
  dateTime: string;
  lastEdited?: string;
  createdAt?: string;
  deviceModel?: string;
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
  imageUrl: string | null; // Deprecated in favor of imageUrls
  imageUrls?: string[]; // New field for multiple images
  distanceFromStump?: string; // New field
  order?: number; // New field for ordering
  createdAt?: any; // Firestore Timestamp
}

// ============= EXAM FUNCTIONS =============

/**
 * Create a new examination
 */
export const createExam = async (examData: Omit<ExamData, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'examinations'), {
      ...examData,
      createdAt: Timestamp.now(),
      lastEdited: Timestamp.now()
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
    const exams = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings
        lastEdited: data.lastEdited?.toDate?.().toISOString() || data.lastEdited,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
      } as ExamData;
    });

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
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings
        lastEdited: data.lastEdited?.toDate?.().toISOString() || data.lastEdited,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
      } as ExamData;
    });
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
    await updateDoc(examRef, {
      ...updates,
      lastEdited: Timestamp.now()
    });
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
): Promise<{ id: string; createdAt: string }> => {
  try {
    console.log('createPoint called with:', { examId, pointData });

    const now = Timestamp.now();

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
      imageUrls: pointData.imageUrls || [],
      distanceFromStump: pointData.distanceFromStump || '',
      order: typeof pointData.order === 'number' ? pointData.order : 0,
      createdAt: now
    };

    console.log('Cleaned data for Firebase:', cleanData);

    const docRef = await addDoc(
      collection(db, 'examinations', examId, 'points'),
      cleanData
    );
    console.log('✅ Point created successfully with ID:', docRef.id);

    return {
      id: docRef.id,
      createdAt: now.toDate().toISOString()
    };
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

    const points = querySnapshot.docs.map(doc => ({
      id: doc.id,
      examId,
      ...doc.data()
    } as PointData));

    // Sort by order if available, otherwise by createdAt
    points.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback to createdAt
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });

    return points;
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

      // Delete legacy image if exists
      if (pointData.imageUrl) {
        await deletePointImage(examId, pointId, pointData.imageUrl);
      }

      // Delete multiple images if exist
      if (pointData.imageUrls && pointData.imageUrls.length > 0) {
        await Promise.all(pointData.imageUrls.map(url =>
          deletePointImage(examId, pointId, url)
        ));
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

/**
 * Delete ALL points for an examination
 * Used when changing limb/location which invalidates existing points
 */
export const deleteExamPoints = async (examId: string): Promise<void> => {
  try {
    const points = await getExamPoints(examId);

    // Delete all points in parallel
    await Promise.all(points.map(async (point) => {
      if (point.id) {
        await deletePoint(examId, point.id);
      }
    }));

    console.log('All exam points deleted successfully');
  } catch (error) {
    console.error('Error deleting exam points:', error);
    throw error;
  }
};

// ============= IMAGE FUNCTIONS =============

/**
 * Upload an image for a point
 * Uses a timestamp to ensure unique filenames for multiple images per point
 */
export const uploadPointImage = async (
  examId: string,
  pointId: string,
  imageDataUrl: string
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const imageRef = ref(getStorage(), `images/${examId}/${pointId}_${timestamp}.jpg`);
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
 * Supports deleting by URL or legacy path
 */
export const deletePointImage = async (
  examId: string,
  pointId: string,
  imageUrl?: string
): Promise<void> => {
  try {
    let imageRef;
    if (imageUrl) {
      // Create ref from URL
      imageRef = ref(getStorage(), imageUrl);
    } else {
      // Fallback to legacy path
      imageRef = ref(getStorage(), `images/${examId}/${pointId}.jpg`);
    }

    await deleteObject(imageRef);
    console.log('Image deleted successfully');
  } catch (error) {
    // Image might not exist, that's okay
    console.warn('Error deleting image (might not exist):', error);
  }
};
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
  // Session duration tracking
  totalDuration?: number; // accumulated seconds across productive sessions
  currentSessionStartedAt?: string; // ISO timestamp of current session start
  lastPointEditedAt?: string; // ISO timestamp of last point add/edit/delete
}

// Cap any single committed session at 2 hours to absorb idle/forgotten-tab cases
const MAX_SESSION_SECONDS = 2 * 60 * 60;

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
  locationDescription?: string;
  pulseLength?: string;
  order?: number; // New field for ordering
  createdAt?: any; // Firestore Timestamp
  hasUnsavedChanges?: boolean; // Local flag for UI state
}

// ============= EXAM FUNCTIONS =============

/**
 * Create a new examination
 */
export const createExam = async (examData: Omit<ExamData, 'id'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'examinations'), {
      ...examData,
      createdAt: now,
      lastEdited: now,
      currentSessionStartedAt: now,
      totalDuration: 0
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
        currentSessionStartedAt: data.currentSessionStartedAt?.toDate?.().toISOString() || data.currentSessionStartedAt,
        lastPointEditedAt: data.lastPointEditedAt?.toDate?.().toISOString() || data.lastPointEditedAt,
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
        currentSessionStartedAt: data.currentSessionStartedAt?.toDate?.().toISOString() || data.currentSessionStartedAt,
        lastPointEditedAt: data.lastPointEditedAt?.toDate?.().toISOString() || data.lastPointEditedAt,
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

/**
 * Increment totalDuration by the time elapsed since the previous point edit (or
 * since sessionStart if this is the first edit in the session), then update
 * lastPointEditedAt to now. Gaps > MAX_SESSION_SECONDS (2h) are treated as
 * inactivity breaks and are not counted.
 *
 * Called after every successful point create/update/delete so that totalDuration
 * always reflects committed active editing time in real-time, without needing to
 * wait for the session to end.
 */
const touchExamPointEdit = async (examId: string): Promise<void> => {
  const examRef = doc(db, 'examinations', examId);
  const snap = await getDoc(examRef);
  if (!snap.exists()) return;
  const data = snap.data();

  const sessionStartIso: string | undefined =
    data.currentSessionStartedAt?.toDate?.().toISOString() || data.currentSessionStartedAt;
  const lastPointEditIso: string | undefined =
    data.lastPointEditedAt?.toDate?.().toISOString() || data.lastPointEditedAt;
  const storedTotal: number = data.totalDuration || 0;

  // Use the most recent of (lastPointEdit, sessionStart) as the previous marker
  const prevMarkerIso =
    lastPointEditIso && sessionStartIso && new Date(lastPointEditIso) > new Date(sessionStartIso)
      ? lastPointEditIso
      : sessionStartIso;

  const now = Timestamp.now();
  let newTotal = storedTotal;
  if (prevMarkerIso) {
    const deltaSec = Math.floor((now.toMillis() - new Date(prevMarkerIso).getTime()) / 1000);
    // Only count if gap is within the inactivity threshold
    if (deltaSec > 0 && deltaSec <= MAX_SESSION_SECONDS) {
      newTotal += deltaSec;
    }
  }

  await updateDoc(examRef, {
    lastEdited: now,
    lastPointEditedAt: now,
    totalDuration: newTotal
  });
};

/**
 * Advance currentSessionStartedAt to "now", marking the start of a fresh session.
 * With live-increment in touchExamPointEdit, all productive duration is already
 * committed by the time this is called — so this just resets the session boundary.
 * Called on exam load (so the next open starts fresh) and on סיים.
 */
export const commitSessionAndAdvance = async (exam: ExamData): Promise<ExamData> => {
  if (!exam.id) return exam;

  const now = Timestamp.now();
  const examRef = doc(db, 'examinations', exam.id);
  await updateDoc(examRef, { currentSessionStartedAt: now });

  return {
    ...exam,
    currentSessionStartedAt: now.toDate().toISOString()
  };
};

/**
 * Reload the session-related fields of an exam from Firestore.
 * Called by the UI after each point op so local state reflects the live-incremented
 * totalDuration without needing to thread return values through every call site.
 */
export const reloadExam = async (examId: string): Promise<Partial<ExamData> | null> => {
  const examRef = doc(db, 'examinations', examId);
  const snap = await getDoc(examRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    totalDuration: data.totalDuration || 0,
    lastEdited: data.lastEdited?.toDate?.().toISOString() || data.lastEdited,
    lastPointEditedAt: data.lastPointEditedAt?.toDate?.().toISOString() || data.lastPointEditedAt,
    currentSessionStartedAt: data.currentSessionStartedAt?.toDate?.().toISOString() || data.currentSessionStartedAt
  };
};

/**
 * Format seconds as h:mm:ss (e.g. "0:02:34", "1:30:00").
 */
export const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      locationDescription: pointData.locationDescription || '',
      pulseLength: pointData.pulseLength || '',
      order: typeof pointData.order === 'number' ? pointData.order : 0,
      createdAt: now
    };

    console.log('Cleaned data for Firebase:', cleanData);

    const docRef = await addDoc(
      collection(db, 'examinations', examId, 'points'),
      cleanData
    );
    console.log('✅ Point created successfully with ID:', docRef.id);

    await touchExamPointEdit(examId);

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
    await touchExamPointEdit(examId);
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
    await touchExamPointEdit(examId);
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
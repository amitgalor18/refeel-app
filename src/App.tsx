import { useState, useEffect, useRef } from 'react';
import { configError, auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import ConfigError from './components/ConfigError';
import type { ExamData, PointData } from './firebaseUtils';
import { createPoint, updatePoint, commitSessionAndAdvance, reloadExam } from './firebaseUtils'; // Import firebase functions
import WelcomePage from './components/WelcomePage';
import ExamPage from './components/ExamPage';
import NewExamForm from './components/NewExamForm';
import TopBar from './components/TopBar';
import EditExamModal from './components/EditExamModal';
import InfoModal from './components/InfoModal';
import UnsavedChangesModal from './components/UnsavedChangesModal'; // Import new modal

const ReFeel = () => {
  const [authLoading, setAuthLoading] = useState(!configError);
  const [currentPage, setCurrentPage] = useState('welcome');
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [points, setPoints] = useState<PointData[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  // showMappingMode removed as part of refactor
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [formData, setFormData] = useState<Partial<ExamData>>({});
  const [loadPatientId, setLoadPatientId] = useState('');
  const [loadPatientName, setLoadPatientName] = useState('');

  // New State for TopBar features
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false); // New state

  // Live ticker for current-session duration display (re-renders every 60s).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (currentPage !== 'exam') return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [currentPage]);

  const currentSessionSeconds = examData?.currentSessionStartedAt
    ? Math.max(0, Math.floor((now - new Date(examData.currentSessionStartedAt).getTime()) / 1000))
    : 0;
  const totalDurationSeconds = examData?.totalDuration || 0;

  // Commit current session's productive duration whenever we leave the exam page.
  // This catches all exit paths (סיים, save-all, discard, etc.) without needing
  // them to all call the same helper — and complements the lazy-commit on load.
  const prevPageRef = useRef(currentPage);
  const examDataRef = useRef(examData);
  useEffect(() => { examDataRef.current = examData; }, [examData]);
  useEffect(() => {
    if (prevPageRef.current === 'exam' && currentPage !== 'exam') {
      const exam = examDataRef.current;
      if (exam?.id) {
        commitSessionAndAdvance(exam)
          .then(updated => setExamData(updated))
          .catch(err => console.error('Failed to commit session duration:', err));
      }
    }
    prevPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (configError) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setAuthLoading(false);
      } else {
        // User is signed out, try to sign in anonymously
        signInAnonymously(auth).catch((error) => {
          console.error("Failed to sign in anonymously:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Navigation Handler
  const handleNavigate = (page: string) => {
    if (page === 'welcome' && currentPage === 'exam') {
      const unsavedPoints = points.filter(p =>
        (typeof p.id === 'string' && p.id.startsWith('temp-')) ||
        p.hasUnsavedChanges
      );
      if (unsavedPoints.length > 0) {
        setShowUnsavedChangesModal(true);
        return;
      }
    }
    setCurrentPage(page);
  };

  // Refresh local examData with latest session/duration fields from server.
  // Called after each point op so the live total stays in sync.
  const refreshExamData = async () => {
    if (!examData?.id) return;
    const fields = await reloadExam(examData.id);
    if (fields) setExamData(prev => prev ? { ...prev, ...fields } : prev);
  };

  // Save All Handler
  const handleSaveAll = async () => {
    if (!examData?.id) return;
    const currentExamId = examData.id; // Capture ID to ensure it's a string in the closure

    const unsavedPoints = points.filter(p =>
      (typeof p.id === 'string' && p.id.startsWith('temp-')) ||
      p.hasUnsavedChanges
    );

    try {
      // Save all points concurrently
      await Promise.all(unsavedPoints.map(async (point) => {
        const { id, examId, hasUnsavedChanges, ...saveData } = point;

        // Ensure stumpPosition is valid (it should be if it's in the list, but good to check)
        if (!point.stumpPosition) return;

        const cleanedData = {
          ...saveData,
          stumpPosition: {
            x: Number(point.stumpPosition.x),
            y: Number(point.stumpPosition.y),
            z: Number(point.stumpPosition.z)
          },
          limbPosition: point.limbPosition ? {
            x: Number(point.limbPosition.x),
            y: Number(point.limbPosition.y),
            z: Number(point.limbPosition.z)
          } : null,
          order: point.order ?? (points.length + 1)
        };

        if (typeof id === 'string' && id.startsWith('temp-')) {
          // Create new
          await createPoint(currentExamId, cleanedData);
        } else if (id) {
          // Update existing
          await updatePoint(currentExamId, id, cleanedData);
        }
      }));

      await refreshExamData();
      console.log('All points saved successfully');
      setShowUnsavedChangesModal(false);
      setCurrentPage('welcome');
    } catch (error) {
      console.error('Error saving all points:', error);
      alert('שגיאה בשמירת הנקודות. אנא נסה שוב.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (configError) {
    return <ConfigError />;
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      <TopBar
        currentPage={currentPage}
        examData={examData}
        currentSessionSeconds={currentSessionSeconds}
        totalDurationSeconds={totalDurationSeconds}
        onNavigate={handleNavigate} // Use custom handler
        onEditExam={() => setShowEditExamModal(true)}
        onShowInfo={() => setShowInfoModal(true)}
      />

      {/* Background Logo */}
      <img
        src="/logo_square.png"
        alt=""
        className="fixed bottom-4 right-4 w-20 h-20 opacity-10 pointer-events-none z-0"
      />

      <div className="relative z-10">
        {currentPage === 'welcome' && (
          <WelcomePage
            loadPatientId={loadPatientId}
            loadPatientName={loadPatientName}
            setLoadPatientId={setLoadPatientId}
            setLoadPatientName={setLoadPatientName}
            setCurrentPage={setCurrentPage}
            setExamData={setExamData}
            setPoints={setPoints}
          />
        )}
        {currentPage === 'newExamForm' && (
          <NewExamForm
            formData={formData}
            setFormData={setFormData}
            setCurrentPage={setCurrentPage}
            setExamData={setExamData}
            setPoints={setPoints}
          />
        )}
        {currentPage === 'exam' && (
          <ExamPage
            key={`${examData?.limb}-${examData?.location}`} // Fix: Force remount on model change
            examData={examData}
            points={points}
            selectedPoint={selectedPoint}
            showDescriptionModal={showDescriptionModal}
            showCameraModal={showCameraModal}
            currentSessionSeconds={currentSessionSeconds}
            totalDurationSeconds={totalDurationSeconds}
            onPointSaved={refreshExamData}
            setSelectedPoint={setSelectedPoint}
            setShowDescriptionModal={setShowDescriptionModal}
            setShowCameraModal={setShowCameraModal}
            setPoints={setPoints}
          />
        )}
      </div>

      {/* Global Modals */}
      {showEditExamModal && examData && (
        <EditExamModal
          examData={examData}
          pointsCount={points.length}
          currentSessionSeconds={currentSessionSeconds}
          totalDurationSeconds={totalDurationSeconds}
          onClose={() => setShowEditExamModal(false)}
          onUpdate={(updatedExam, pointsDeleted) => {
            setExamData(updatedExam);
            if (pointsDeleted) {
              setPoints([]);
              setSelectedPoint(null); // Fix: Reset selected point to avoid crash
            }
          }}
        />
      )}

      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} />
      )}

      {showUnsavedChangesModal && (
        <UnsavedChangesModal
          unsavedCount={points.filter(p =>
            (typeof p.id === 'string' && p.id.startsWith('temp-')) ||
            p.hasUnsavedChanges
          ).length}
          onSaveAll={handleSaveAll}
          onDiscard={() => {
            setShowUnsavedChangesModal(false);
            setCurrentPage('welcome');
          }}
          onCancel={() => setShowUnsavedChangesModal(false)}
        />
      )}
    </div>
  );
};

export default ReFeel;
import { useState } from 'react';
import { configError } from './firebase';
import ConfigError from './components/ConfigError';
import type { ExamData, PointData } from './firebaseUtils';
import { createPoint, updatePoint } from './firebaseUtils'; // Import firebase functions
import WelcomePage from './components/WelcomePage';
import ExamPage from './components/ExamPage';
import NewExamForm from './components/NewExamForm';
import TopBar from './components/TopBar';
import EditExamModal from './components/EditExamModal';
import InfoModal from './components/InfoModal';
import UnsavedChangesModal from './components/UnsavedChangesModal'; // Import new modal

const ReFeel = () => {
  if (configError) {
    return <ConfigError />;
  }

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

      console.log('All points saved successfully');
      setShowUnsavedChangesModal(false);
      setCurrentPage('welcome');
    } catch (error) {
      console.error('Error saving all points:', error);
      alert('שגיאה בשמירת הנקודות. אנא נסה שוב.');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <TopBar
        currentPage={currentPage}
        examData={examData}
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
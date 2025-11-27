import { useState } from 'react';
import { configError } from './firebase';
import ConfigError from './components/ConfigError';
import type { ExamData, PointData } from './firebaseUtils';
import WelcomePage from './components/WelcomePage';
import ExamPage from './components/ExamPage';
import NewExamForm from './components/NewExamForm';
import TopBar from './components/TopBar';
import EditExamModal from './components/EditExamModal';
import InfoModal from './components/InfoModal';

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

  return (
    <div className="relative min-h-screen bg-gray-50">
      <TopBar
        currentPage={currentPage}
        examData={examData}
        onNavigate={setCurrentPage}
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
    </div>
  );
};

export default ReFeel;
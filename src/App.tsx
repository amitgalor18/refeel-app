import { useState } from 'react';
import type {ExamData, PointData} from './firebaseUtils';
import WelcomePage from './components/WelcomePage';
import ExamPage from './components/ExamPage';
import NewExamForm from './components/NewExamForm';

const ReFeel = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [points, setPoints] = useState<PointData[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showMappingMode, setShowMappingMode] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [formData, setFormData] = useState<Partial<ExamData>>({});
  const [loadPatientId, setLoadPatientId] = useState('');
  const [loadPatientName, setLoadPatientName] = useState('');

  return (
    <div className="relative min-h-screen">
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
            examData={examData}
            points={points}
            selectedPoint={selectedPoint}
            showMappingMode={showMappingMode}
            showDescriptionModal={showDescriptionModal}
            showCameraModal={showCameraModal}
            setCurrentPage={setCurrentPage}
            setSelectedPoint={setSelectedPoint}
            setShowDescriptionModal={setShowDescriptionModal}
            setShowMappingMode={setShowMappingMode}
            setShowCameraModal={setShowCameraModal}
            setPoints={setPoints}
          />
        )}
      </div>
    </div>
  );
};

export default ReFeel;
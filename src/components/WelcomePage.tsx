import React from 'react';
import { Plus } from 'lucide-react';
import { loadExam, getExamPoints } from '../firebaseUtils';
import type { ExamData, PointData } from '../firebaseUtils';

interface WelcomePageProps {
  loadPatientId: string;
  loadPatientName: string;
  setLoadPatientId: (id: string) => void;
  setLoadPatientName: (name: string) => void;
  setCurrentPage: (page: string) => void;
  setExamData: (data: ExamData | null) => void;
  setPoints: (points: PointData[]) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({
  loadPatientId,
  loadPatientName,
  setLoadPatientId,
  setLoadPatientName,
  setCurrentPage,
  setExamData,
  setPoints
}) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
    
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <img 
            src="/logo_banner.png" 
            alt="ReFeel Banner" 
            className="w-full max-w-sm mx-auto mb-6" 
        />
      <p className="text-gray-600 mb-8 text-center">מערכת למיפוי תחושות בגדם לטיפול בנכים</p>
      
      <div className="space-y-6">
        {/* Load Existing Exam */}
        <div className="border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">טען מיפוי קיים</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="שם המטופל"
              value={loadPatientName}
              onChange={(e) => setLoadPatientName(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="מספר זהות"
              value={loadPatientId}
              onChange={(e) => setLoadPatientId(e.target.value)}
              className="w-full p-2 border rounded"
            />
              <button
                onClick={async () => {
                  if (!loadPatientName.trim() || !loadPatientId.trim()) {
                    alert('נא למלא את כל השדות');
                    return;
                  }
                  
                  try {
                    const exam = await loadExam(loadPatientName, loadPatientId);
                    if (exam) {
                      const points = await getExamPoints(exam.id!);
                      setExamData(exam);
                      setPoints(points);
                      setCurrentPage('exam');
                      alert('בדיקה נטענה בהצלחה');
                    } else {
                      alert('לא נמצאה בדיקה למטופל זה');
                    }
                  } catch (error) {
                    console.error('Error loading exam:', error);
                    alert('שגיאה בטעינת הבדיקה');
                  }
                }}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
              >
                טען מיפוי
              </button>
          </div>
        </div>

        {/* New Exam */}
        <div className="border-2 border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">בדיקה חדשה</h2>
          <button
            onClick={() => setCurrentPage('newExamForm')}
            className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            התחל בדיקה חדשה
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default WelcomePage;
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
  <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4" dir="rtl">

    <div className="bg-bg-secondary rounded-xl shadow-2xl p-8 max-w-2xl w-full border border-border-subtle">
      <img
        src="/logo_banner_dark-removebg.png"
        alt="ReFeel Banner"
        className="w-full max-w-sm mx-auto mb-6"
      />
      <p className="text-text-primary mb-8 text-center">מערכת למיפוי תחושות בגדם </p>

      <div className="space-y-8">
        {/* Load Existing Exam */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">טען מיפוי קיים</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="שם המטופל"
              value={loadPatientName}
              onChange={(e) => setLoadPatientName(e.target.value)}
              className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 outline-none transition"
            />
            <input
              type="text"
              placeholder="מספר זהות"
              value={loadPatientId}
              onChange={(e) => setLoadPatientId(e.target.value)}
              className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 outline-none transition"
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
              className="w-full bg-accent-blue text-white py-3 rounded-lg hover:bg-blue-600 transition font-medium shadow-lg shadow-blue-500/20"
            >
              טען מיפוי
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle"></div>

        {/* New Exam */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">בדיקה חדשה</h2>
          <button
            onClick={() => setCurrentPage('newExamForm')}
            className="w-full bg-accent-blue text-white py-3 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/20"
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
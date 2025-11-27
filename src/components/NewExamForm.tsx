import React from 'react';
import type { ExamData } from '../firebaseUtils';
import { createExam } from '../firebaseUtils';

interface NewExamFormProps {
  formData: Partial<ExamData>;
  setFormData: (data: Partial<ExamData>) => void;
  setCurrentPage: (page: string) => void;
  setExamData: (data: ExamData) => void;
  setPoints: (points: any[]) => void;
}

const NewExamForm: React.FC<NewExamFormProps> = ({
  formData,
  setFormData,
  setCurrentPage,
  setExamData,
  setPoints
}) => {
  // Set default device model if not present
  React.useEffect(() => {
    if (!formData.deviceModel) {
      setFormData({ ...formData, deviceModel: 'Beurer EM 49' });
    }
  }, []);

  const isValid = () => {
    return (
      formData.patientName &&
      formData.patientId &&
      formData.limb &&
      formData.location &&
      formData.therapistName
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <h2 className="text-3xl font-bold text-green-600 mb-6">פרטי בדיקה חדשה</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם המטופל <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.patientName || ''}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">מספר זהות <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.patientId || ''}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">איבר מושפע <span className="text-red-500">*</span></label>
            <select
              value={formData.limb || ''}
              onChange={(e) => setFormData({ ...formData, limb: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">בחר איבר</option>
              <option value="leg-right">רגל ימין</option>
              <option value="leg-left">רגל שמאל</option>
              <option value="arm-right">יד ימין</option>
              <option value="arm-left">יד שמאל</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">מיקום הכריתה <span className="text-red-500">*</span></label>
            <select
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">בחר מיקום</option>
              {formData.limb?.startsWith('leg') ? (
                <>
                  <option value="above-knee">מעל הברך</option>
                  <option value="below-knee">מתחת לברך</option>
                </>
              ) : formData.limb?.startsWith('arm') ? (
                <>
                  <option value="above-elbow">מעל המרפק</option>
                  <option value="below-elbow">מתחת למרפק</option>
                </>
              ) : null}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">שם המטפל <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.therapistName || ''}
              onChange={(e) => setFormData({ ...formData, therapistName: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">דגם מכשיר עצבוב</label>
            <select
              value={formData.deviceModel || 'Beurer EM 49'}
              onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="Beurer EM 49">Beurer EM 49</option>
              <option value="Other">אחר</option>
            </select>
            {formData.deviceModel === 'Other' && (
              <input
                type="text"
                placeholder="הכנס שם דגם"
                className="w-full p-2 border rounded mt-2"
                onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setCurrentPage('welcome')}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
            >
              ביטול
            </button>
            <button
              disabled={!isValid()}
              onClick={async () => {
                try {
                  const examToSave = {
                    patientName: formData.patientName || '',
                    patientId: formData.patientId || '',
                    limb: formData.limb || '',
                    location: formData.location || '',
                    therapistName: formData.therapistName || '',
                    deviceModel: formData.deviceModel || 'Beurer EM 49',
                    dateTime: new Date().toISOString()
                  };

                  const examId = await createExam(examToSave);
                  const exam = {
                    ...examToSave,
                    id: examId
                  } as ExamData;

                  setExamData(exam);
                  setPoints([]);
                  setCurrentPage('exam');
                  alert('בדיקה נשמרה בהצלחה');
                } catch (error) {
                  console.error('Error saving exam:', error);
                  alert('שגיאה בשמירת הבדיקה');
                }
              }}
              className={`flex-1 text-white py-2 rounded transition ${isValid()
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-green-300 cursor-not-allowed'
                }`}
            >
              התחל בדיקה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewExamForm;
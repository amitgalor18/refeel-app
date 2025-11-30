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
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4" dir="rtl">
      <div className="bg-bg-secondary rounded-xl shadow-xl p-8 max-w-2xl w-full border border-border-subtle">
        <h2 className="text-3xl font-bold text-accent-blue mb-6 text-center">פרטי בדיקה חדשה</h2>

        <div className="space-y-6">
          {/* Patient Details Section */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-subtle pb-2">פרטי נבדק</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">שם המטופל <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={formData.patientName || ''}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none transition"
                  placeholder="הכנס שם מלא"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">מספר זהות <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={formData.patientId || ''}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none transition"
                  placeholder="הכנס ת.ז."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">איבר מושפע <span className="text-error">*</span></label>
                  <select
                    value={formData.limb || ''}
                    onChange={(e) => setFormData({ ...formData, limb: e.target.value })}
                    className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none transition"
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
                  <label className="block text-sm font-medium text-text-primary mb-1">מיקום הכריתה <span className="text-error">*</span></label>
                  <select
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none transition"
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
              </div>
            </div>
          </div>

          {/* Therapist Details Section */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-subtle pb-2 pt-2">פרטי מטפל</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">שם המטפל <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={formData.therapistName || ''}
                  onChange={(e) => setFormData({ ...formData, therapistName: e.target.value })}
                  className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none transition"
                  placeholder="הכנס שם המטפל"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">דגם מכשיר עצבוב</label>
                <select
                  value={formData.deviceModel || 'Beurer EM 49'}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none transition"
                >
                  <option value="Beurer EM 49">Beurer EM 49</option>
                  <option value="Other">אחר</option>
                </select>
                {formData.deviceModel === 'Other' && (
                  <input
                    type="text"
                    placeholder="הכנס שם דגם"
                    className="w-full p-3 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none transition mt-2"
                    onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              onClick={() => setCurrentPage('welcome')}
              className="flex-1 bg-bg-input text-text-primary py-3 rounded-lg hover:bg-slate-600 transition font-medium"
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
                } catch (error) {
                  console.error('Error saving exam:', error);
                  alert('שגיאה בשמירת הבדיקה');
                }
              }}
              className={`flex-1 text-white py-3 rounded-lg transition font-medium ${isValid()
                ? 'bg-accent-blue hover:bg-blue-600 shadow-lg shadow-blue-500/30'
                : 'bg-slate-600 cursor-not-allowed opacity-50'
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
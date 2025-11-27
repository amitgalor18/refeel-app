import React from 'react';
import { X } from 'lucide-react';

interface InfoModalProps {
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold">פרוטוקול בדיקה</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4 text-gray-700">
                    <p>
                        <strong>מטרת הבדיקה:</strong> מיפוי תחושתי של הגדם והאיבר הפנטום לצורך התאמת טיפול.
                    </p>

                    <h3 className="font-bold text-lg mt-4">שלבי הבדיקה:</h3>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>יש לוודא שהמטופל יושב בנוחות והאזור הנבדק חשוף ונגיש.</li>
                        <li>יש להסביר למטופל את מהלך הבדיקה ולקבל את הסכמתו.</li>
                        <li>יש לבחור נקודה על גבי מודל הגדם המופיע במסך.</li>
                        <li>יש לבצע גירוי בנקודה המקבילה על גבי גדם המטופל.</li>
                        <li>יש לשאול את המטופל היכן הוא מרגיש את התחושה (בגדם עצמו או באיבר הפנטום).</li>
                        <li>אם התחושה היא באיבר הפנטום, יש לסמן את המיקום המקביל על גבי מודל האיבר השלם ("מיפוי").</li>
                        <li>יש לתעד את סוג הגירוי, עוצמתו, ותיאור התחושה של המטופל.</li>
                        <li>ניתן לצלם את אזור הבדיקה לתיעוד נוסף.</li>
                        <li>יש לחזור על התהליך עבור מספר נקודות (עד 10 נקודות).</li>
                    </ol>


                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                    >
                        סגור
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;

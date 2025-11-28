import React from 'react';
import { X } from 'lucide-react';

interface InfoModalProps {
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-bg-secondary rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border-subtle text-text-primary">
                <div className="p-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-bg-secondary">
                    <h2 className="text-xl font-bold text-text-primary">פרוטוקול בדיקה</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-text-primary transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4 text-text-primary">
                    <p>
                        <strong className="text-accent-blue">מטרת הבדיקה:</strong> מיפוי תחושתי של הגדם לצורך התאמת טיפול.
                    </p>

                    <h3 className="font-bold text-lg mt-4 text-accent-blue">שלבי הבדיקה:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300">
                        <li>יש לוודא שהמטופל יושב בנוחות והאזור הנבדק חשוף ונגיש.</li>
                        <li>יש להסביר למטופל את מהלך הבדיקה ולקבל את הסכמתו.</li>
                        <li>יש לבחור נקודה על גבי מודל הגדם המופיע במסך.</li>
                        <li>יש לבצע גירוי בנקודה המקבילה על גבי גדם המטופל.</li>
                        <li>יש לשאול את המטופל היכן הוא מרגיש את התחושה (והאם יש תחושה באיבר הפנטום).</li>
                        <li>אם התחושה היא בנקודה מסוימת איבר הפנטום, יש לסמן את המיקום  על גבי מודל האיבר השלם ("מיפוי").</li>
                        <li>יש לתעד את סוג הגירוי, עוצמתו, ותיאור התחושה של המטופל.</li>
                        <li>ניתן לצלם את אזור הבדיקה לתיעוד נוסף.</li>
                        <li>יש לחזור על התהליך עבור מספר נקודות (עד 10 נקודות).</li>
                    </ol>
                </div>

                <div className="p-4 border-t border-border-subtle bg-bg-secondary flex justify-end rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="bg-accent-blue text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                        סגור
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;

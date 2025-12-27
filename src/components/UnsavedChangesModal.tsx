import React from 'react';
import { BiSolidSave, BiSolidTrash, BiSolidXCircle } from 'react-icons/bi';

interface UnsavedChangesModalProps {
    onSaveAll: () => void;
    onDiscard: () => void;
    onCancel: () => void;
    unsavedCount: number;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    onSaveAll,
    onDiscard,
    onCancel,
    unsavedCount
}) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-secondary rounded-xl shadow-2xl max-w-md w-full border border-border-subtle text-text-primary overflow-hidden">
                <div className="bg-accent-blue/10 p-4 border-b border-border-subtle flex items-center gap-3">
                    <div className="bg-accent-blue/20 p-2 rounded-full text-accent-blue">
                        <BiSolidSave size={24} />
                    </div>
                    <h3 className="text-xl font-bold">שינויים לא שמורים</h3>
                </div>

                <div className="p-6">
                    <p className="text-lg mb-2">
                        ישנן <span className="font-bold text-accent-blue">{unsavedCount}</span> נקודות שלא נשמרו.
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        האם ברצונך לשמור את כל השינויים לפני היציאה?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onSaveAll}
                            className="w-full bg-accent-blue text-white py-3 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-900/20"
                        >
                            <BiSolidSave size={20} />
                            שמור הכל וסיים
                        </button>

                        <button
                            onClick={onDiscard}
                            className="w-full bg-bg-input text-error hover:bg-red-900/20 py-3 rounded-lg transition flex items-center justify-center gap-2 font-medium border border-transparent hover:border-error/30"
                        >
                            <BiSolidTrash size={20} />
                            מחק שינויים וצא
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full text-gray-400 hover:text-white py-2 transition flex items-center justify-center gap-2 text-sm mt-2"
                        >
                            <BiSolidXCircle size={18} />
                            ביטול וחזרה לעריכה
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesModal;

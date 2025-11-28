import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Edit2, Calendar, Clock } from 'lucide-react';
import type { ExamData } from '../firebaseUtils';
import { updateExam, deleteExamPoints } from '../firebaseUtils';

interface EditExamModalProps {
    examData: ExamData;
    pointsCount: number;
    onClose: () => void;
    onUpdate: (updatedExam: ExamData, pointsDeleted: boolean) => void;
}

const EditExamModal: React.FC<EditExamModalProps> = ({ examData, pointsCount, onClose, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ExamData>>({ ...examData });
    const [showWarning, setShowWarning] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Check if critical fields changed
    const isCriticalChange =
        formData.limb !== examData.limb ||
        formData.location !== examData.location;

    useEffect(() => {
        if (isCriticalChange && pointsCount > 0) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
            setConfirmDelete(false);
        }
    }, [formData.limb, formData.location, pointsCount]);

    const handleSave = async () => {
        if (!examData.id) return;

        try {
            let pointsDeleted = false;

            if (isCriticalChange && pointsCount > 0) {
                if (!confirmDelete) return; // Should be blocked by UI, but double check

                // Delete all points
                await deleteExamPoints(examData.id);
                pointsDeleted = true;
            }

            // Update exam
            const updates = {
                patientName: formData.patientName || '',
                patientId: formData.patientId || '',
                limb: formData.limb || '',
                location: formData.location || '',
                therapistName: formData.therapistName || '',
                deviceModel: formData.deviceModel || ''
            };

            await updateExam(examData.id, updates);

            onUpdate({ ...examData, ...updates }, pointsDeleted);
            setIsEditing(false); // Switch back to view mode
            alert('פרטי הבדיקה עודכנו בהצלחה');

        } catch (error) {
            console.error('Error updating exam:', error);
            alert('שגיאה בעדכון פרטי הבדיקה');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('he-IL');
    };

    const getLimbLabel = (limb?: string) => {
        switch (limb) {
            case 'leg-right': return 'רגל ימין';
            case 'leg-left': return 'רגל שמאל';
            case 'arm-right': return 'יד ימין';
            case 'arm-left': return 'יד שמאל';
            default: return limb;
        }
    };

    const getLocationLabel = (location?: string) => {
        switch (location) {
            case 'above-knee': return 'מעל הברך';
            case 'below-knee': return 'מתחת לברך';
            case 'above-elbow': return 'מעל המרפק';
            case 'below-elbow': return 'מתחת למרפק';
            default: return location;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-bg-secondary rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border-subtle text-text-primary">
                <div className="p-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-bg-secondary z-10">
                    <h2 className="text-xl font-bold text-text-primary">פרטי בדיקה</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-text-primary transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Timestamps */}
                    <div className="flex gap-6 text-sm text-gray-400 bg-bg-input p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>נוצר: {formatDate(examData.dateTime)}</span>
                        </div>
                        {examData.lastEdited && (
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span className="text-accent-blue">נערך לאחרונה: {formatDate(examData.lastEdited)}</span>
                            </div>
                        )}
                    </div>

                    {!isEditing ? (
                        /* VIEW MODE */
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">שם המטופל</label>
                                    <div className="text-lg font-medium text-text-primary">{examData.patientName}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">מספר זהות</label>
                                    <div className="text-lg font-medium text-text-primary">{examData.patientId}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">איבר מושפע</label>
                                    <div className="text-lg font-medium text-text-primary">{getLimbLabel(examData.limb)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">מיקום הכריתה</label>
                                    <div className="text-lg font-medium text-text-primary">{getLocationLabel(examData.location)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">שם המטפל</label>
                                    <div className="text-lg font-medium text-text-primary">{examData.therapistName}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">דגם מכשיר</label>
                                    <div className="text-lg font-medium text-text-primary">{examData.deviceModel || '-'}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EDIT MODE */
                        <div className="space-y-4">
                            {/* Warning Banner */}
                            {showWarning && (
                                <div className="bg-red-900/20 border-r-4 border-error p-4 mb-4 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-error flex-shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-error">אזהרה: שינוי קריטי</h3>
                                            <p className="text-sm text-red-200 mt-1">
                                                שינוי האיבר או מיקום הכריתה יגרום ל<strong>מחיקת כל {pointsCount} הנקודות</strong> שנשמרו בבדיקה זו, כיוון שהן לא יתאימו למודל החדש.
                                            </p>
                                            <div className="mt-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={confirmDelete}
                                                        onChange={(e) => setConfirmDelete(e.target.checked)}
                                                        className="w-4 h-4 text-error rounded focus:ring-error bg-bg-input border-border-subtle"
                                                    />
                                                    <span className="text-sm font-medium text-red-200">
                                                        אני מאשר את מחיקת הנקודות לצורך עדכון הפרטים
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">שם המטופל</label>
                                    <input
                                        type="text"
                                        value={formData.patientName || ''}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">מספר זהות</label>
                                    <input
                                        type="text"
                                        value={formData.patientId || ''}
                                        onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">איבר מושפע</label>
                                    <select
                                        value={formData.limb || ''}
                                        onChange={(e) => {
                                            const newLimb = e.target.value;
                                            setFormData({
                                                ...formData,
                                                limb: newLimb,
                                                location: '' // Reset location on limb change
                                            });
                                        }}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    >
                                        <option value="leg-right">רגל ימין</option>
                                        <option value="leg-left">רגל שמאל</option>
                                        <option value="arm-right">יד ימין</option>
                                        <option value="arm-left">יד שמאל</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">מיקום הכריתה</label>
                                    <select
                                        value={formData.location || ''}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    >
                                        <option value="" disabled>בחר מיקום</option>
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
                                    <label className="block text-sm font-medium mb-1 text-gray-400">שם המטפל</label>
                                    <input
                                        type="text"
                                        value={formData.therapistName || ''}
                                        onChange={(e) => setFormData({ ...formData, therapistName: e.target.value })}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">דגם מכשיר</label>
                                    <input
                                        type="text"
                                        value={formData.deviceModel || ''}
                                        onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                                        className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border-subtle bg-bg-secondary flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-text-primary bg-bg-input rounded-lg hover:bg-gray-600 transition"
                    >
                        {isEditing ? 'ביטול' : 'סגור'}
                    </button>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                        >
                            <Edit2 size={16} />
                            ערוך פרטים
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={showWarning && !confirmDelete}
                            className={`px-4 py-2 text-white rounded-lg transition ${showWarning && !confirmDelete
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-accent-blue hover:bg-blue-600'
                                }`}
                        >
                            שמור שינויים
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditExamModal;

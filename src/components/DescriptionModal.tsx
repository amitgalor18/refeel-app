import React, { useState, useEffect } from 'react';
import { Edit, X, Trash2 } from 'lucide-react';
import type { PointData } from '../firebaseUtils.ts';
import { deletePointImage } from '../firebaseUtils.ts';

interface DescriptionModalProps {
  point: PointData;
  examId: string;
  therapistName: string;
  initialViewMode?: boolean;
  onClose: () => void;
  onSave: (updates: Partial<PointData>, shouldClose?: boolean) => void;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({
  point,
  examId,
  therapistName,
  initialViewMode = false,
  onClose,
  onSave
}) => {
  console.log('DescriptionModal Render:', {
    pointId: point.id,
    imageUrlsCount: point.imageUrls?.length,
    firstImageUrl: point.imageUrls?.[0]
  });

  const [isEditing, setIsEditing] = useState(!initialViewMode);
  // Local state for the form, initialized from the point prop
  const [formData, setFormData] = useState({
    stimulationType: point.stimulationType || '',
    program: point.program || '',
    frequency: point.frequency || '',
    sensation: point.sensation || '',
    distanceFromStump: point.distanceFromStump || ''
  });

  // State for custom image deletion confirmation modal
  const [imageToDelete, setImageToDelete] = useState<{ url: string, isLegacy: boolean } | null>(null);

  // Update local state if the selected point changes
  useEffect(() => {
    setFormData({
      stimulationType: point.stimulationType || '',
      program: point.program || '',
      frequency: point.frequency || '',
      sensation: point.sensation || '',
      distanceFromStump: point.distanceFromStump || ''
    });
  }, [point]);

  const handleSave = () => {
    onSave(formData, true);
    if (initialViewMode) {
      setIsEditing(false);
    }
  };

  const handleDeleteClick = (url: string, isLegacy: boolean) => {
    setImageToDelete({ url, isLegacy });
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;

    const { url, isLegacy } = imageToDelete;
    console.log('Confirmed delete image', { url, isLegacy });

    try {
      // Delete from storage
      if (point.id && examId) {
        console.log('Deleting from storage...', { examId, pointId: point.id });
        await deletePointImage(examId, point.id, url);
      }

      // Update local state and parent
      let updates: Partial<PointData> = {};

      if (isLegacy) {
        updates = { imageUrl: null };
      } else {
        const currentUrls = point.imageUrls || [];
        const newImageUrls = currentUrls.filter(u => u !== url);
        updates = { imageUrls: newImageUrls };
      }

      console.log('Calling onSave with updates:', updates);
      onSave(updates, false);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('שגיאה במחיקת תמונה');
    } finally {
      setImageToDelete(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'לא ידוע';
    // Handle Firestore Timestamp
    if (timestamp.toDate) return timestamp.toDate().toLocaleString('he-IL');
    // Handle Date object or string
    return new Date(timestamp).toLocaleString('he-IL');
  };

  if (!isEditing) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" dir="rtl">
        <div className="bg-bg-secondary rounded-xl p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto relative border border-border-subtle text-text-primary">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-text-primary">פרטי נקודה</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-text-primary transition">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-bg-input p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-accent-blue block">תאריך שמירה:</span>
                <span className="text-text-primary">{formatDate(point.createdAt)}</span>
              </div>
              <div>
                <span className="font-semibold text-accent-blue block">מטפל:</span>
                <span className="text-text-primary">{therapistName}</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">תיאור תוכנית טיפול</label>
                <div className="p-2 bg-bg-input rounded-lg border border-border-subtle text-text-primary">
                  {formData.stimulationType === 'massage' ? 'עיסוי (Massage)' :
                    formData.stimulationType === 'ems' ? 'גירוי שריר (EMS)' :
                      formData.stimulationType === 'tens' ? 'גירוי עצבי (TENS)' :
                        formData.stimulationType || '-'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">תדירות</label>
                <div className="p-2 bg-bg-input rounded-lg border border-border-subtle text-text-primary">
                  {formData.frequency || '-'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">מרחק מקצה הגדם</label>
                <div className="p-2 bg-bg-input rounded-lg border border-border-subtle text-text-primary">
                  {formData.distanceFromStump ? `${formData.distanceFromStump} ס"מ` : '-'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">תוכנית</label>
                <div className="p-2 bg-bg-input rounded-lg border border-border-subtle text-text-primary">
                  {formData.program || '-'}
                </div>
              </div>
            </div>

            {/* Sensation */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">תיאור התחושה</label>
              <div className="p-3 bg-bg-input rounded-lg border border-border-subtle min-h-[80px] whitespace-pre-wrap text-text-primary">
                {formData.sensation || 'אין תיאור'}
              </div>
            </div>

            {/* Image Grid */}
            {(point.imageUrls?.length || 0) > 0 || point.imageUrl ? (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">תמונות מצורפות</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Legacy single image */}
                  {point.imageUrl && (
                    <div className="relative aspect-square border border-border-subtle rounded-lg overflow-hidden group">
                      <img
                        src={point.imageUrl}
                        alt="Point"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all cursor-pointer flex items-center justify-center"
                        onClick={() => window.open(point.imageUrl || '', '_blank')}>
                      </div>
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (point.imageUrl) handleDeleteClick(point.imageUrl, true);
                          }}
                          className="absolute top-1 right-1 bg-error text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="מחק תמונה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {/* New multiple images */}
                  {point.imageUrls?.map((url, index) => (
                    <div key={url} className="relative aspect-square border border-border-subtle rounded-lg overflow-hidden group">
                      <img
                        src={url}
                        alt={`Point ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all cursor-pointer flex items-center justify-center"
                        onClick={() => window.open(url, '_blank')}>
                      </div>
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(url, false);
                          }}
                          className="absolute top-1 right-1 bg-error text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="מחק תמונה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Action */}
            <div className="flex justify-end pt-4 border-t border-border-subtle">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-accent-blue hover:text-blue-400 font-medium px-4 py-2 rounded-lg hover:bg-bg-input transition-colors"
              >
                <Edit size={18} />
                ערוך פרטים
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {imageToDelete && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-bg-secondary p-6 rounded-xl shadow-xl max-w-sm w-full mx-4 border border-border-subtle">
                <h4 className="text-lg font-bold mb-4 text-error">מחיקת תמונה</h4>
                <p className="mb-6 text-text-primary">האם אתה בטוח שברצונך למחוק את התמונה?</p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmDeleteImage}
                    className="flex-1 bg-error text-white py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setImageToDelete(null)}
                    className="flex-1 bg-bg-input text-text-primary py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-bg-secondary rounded-xl p-6 max-w-2xl w-full m-4 relative border border-border-subtle text-text-primary">
        <h3 className="text-xl font-bold mb-4 text-text-primary">תיאור נקודה</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">סוג גירוי</label>
            <select
              value={formData.stimulationType}
              onChange={(e) => setFormData({ ...formData, stimulationType: e.target.value })}
              className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary focus:ring-2 focus:ring-accent-blue outline-none"
            >
              <option value="">בחר סוג</option>
              <option value="massage">עיסוי (Massage)</option>
              <option value="ems">EMS</option>
              <option value="tens">TENS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">תוכנית</label>
            <input
              type="text"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">תדירות</label>
            <input
              type="text"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">מרחק מקצה הגדם (ס"מ)</label>
            <input
              type="number"
              value={formData.distanceFromStump}
              onChange={(e) => setFormData({ ...formData, distanceFromStump: e.target.value })}
              className="w-full p-2 bg-bg-input border-none rounded-lg text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">תיאור התחושה</label>
            <textarea
              value={formData.sensation}
              onChange={(e) => setFormData({ ...formData, sensation: e.target.value })}
              className="w-full p-2 bg-bg-input border-none rounded-lg h-32 text-text-primary placeholder-gray-400 focus:ring-2 focus:ring-accent-blue outline-none"
              placeholder="היכן באיבר הפנטום הורגשה התחושה? איך הרגישה?"
            ></textarea>
          </div>

          {/* Image Grid (Edit Mode) */}
          {(point.imageUrls?.length || 0) > 0 || point.imageUrl ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">תמונות מצורפות</label>
              <div className="grid grid-cols-3 gap-2">
                {/* Legacy single image */}
                {point.imageUrl && (
                  <div className="relative aspect-square border border-border-subtle rounded-lg overflow-hidden group">
                    <img
                      src={point.imageUrl}
                      alt="Point"
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay for click action - disabled in edit mode */}
                    <div className={`absolute inset-0 transition-all flex items-center justify-center ${!isEditing ? 'bg-black bg-opacity-0 group-hover:bg-opacity-20 cursor-pointer' : ''}`}
                      onClick={() => !isEditing && window.open(point.imageUrl || '', '_blank')}>
                    </div>

                    {/* Delete button - always visible and larger in edit mode */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (point.imageUrl) handleDeleteClick(point.imageUrl, true);
                      }}
                      className="absolute top-1 right-1 bg-error text-white p-2 rounded-full shadow-md z-10 hover:bg-red-600 transition"
                      title="מחק תמונה"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {/* New multiple images */}
                {point.imageUrls?.map((url, index) => (
                  <div key={url} className="relative aspect-square border border-border-subtle rounded-lg overflow-hidden group">
                    <img
                      src={url}
                      alt={`Point ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay for click action - disabled in edit mode */}
                    <div className={`absolute inset-0 transition-all flex items-center justify-center ${!isEditing ? 'bg-black bg-opacity-0 group-hover:bg-opacity-20 cursor-pointer' : ''}`}
                      onClick={() => !isEditing && window.open(url, '_blank')}>
                    </div>

                    {/* Delete button - always visible and larger in edit mode */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(url, false);
                      }}
                      className="absolute top-1 right-1 bg-error text-white p-2 rounded-full shadow-md z-10 hover:bg-red-600 transition"
                      title="מחק תמונה"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={onClose} // Use onClose prop
              className="flex-1 bg-bg-input text-text-primary py-2 rounded-lg hover:bg-gray-600 transition"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-accent-blue text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              שמור
            </button>
          </div>

          {/* Delete Confirmation Modal (Edit Mode) */}
          {imageToDelete && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-bg-secondary p-6 rounded-xl shadow-xl max-w-sm w-full mx-4 border border-border-subtle">
                <h4 className="text-lg font-bold mb-4 text-error">מחיקת תמונה</h4>
                <p className="mb-6 text-text-primary">האם אתה בטוח שברצונך למחוק את התמונה?</p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmDeleteImage}
                    className="flex-1 bg-error text-white py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setImageToDelete(null)}
                    className="flex-1 bg-bg-input text-text-primary py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescriptionModal;
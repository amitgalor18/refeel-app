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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">פרטי נקודה</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600 block">תאריך שמירה:</span>
                <span>{formatDate(point.createdAt)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600 block">מטפל:</span>
                <span>{therapistName}</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">סוג גירוי</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  {formData.stimulationType === 'massage' ? 'עיסוי (Massage)' :
                    formData.stimulationType === 'ems' ? 'EMS' :
                      formData.stimulationType === 'tens' ? 'TENS' :
                        formData.stimulationType || '-'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">תדירות</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  {formData.frequency || '-'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">מרחק מקצה הגדם</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  {formData.distanceFromStump ? `${formData.distanceFromStump} ס"מ` : '-'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">תוכנית</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  {formData.program || '-'}
                </div>
              </div>
            </div>

            {/* Sensation */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">תיאור התחושה</label>
              <div className="p-3 bg-gray-50 rounded border border-gray-200 min-h-[80px] whitespace-pre-wrap">
                {formData.sensation || 'אין תיאור'}
              </div>
            </div>

            {/* Image Grid */}
            {(point.imageUrls?.length || 0) > 0 || point.imageUrl ? (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">תמונות מצורפות</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Legacy single image */}
                  {point.imageUrl && (
                    <div className="relative aspect-square border rounded overflow-hidden group">
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
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="מחק תמונה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {/* New multiple images */}
                  {point.imageUrls?.map((url, index) => (
                    <div key={url} className="relative aspect-square border rounded overflow-hidden group">
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
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium px-4 py-2 rounded hover:bg-blue-50 transition-colors"
              >
                <Edit size={18} />
                ערוך פרטים
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {imageToDelete && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <h4 className="text-lg font-bold mb-4">מחיקת תמונה</h4>
                <p className="mb-6 text-gray-600">האם אתה בטוח שברצונך למחוק את התמונה?</p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmDeleteImage}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setImageToDelete(null)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 relative">
        <h3 className="text-xl font-bold mb-4">תיאור נקודה</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">סוג גירוי</label>
            <select
              value={formData.stimulationType}
              onChange={(e) => setFormData({ ...formData, stimulationType: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">בחר סוג</option>
              <option value="massage">עיסוי (Massage)</option>
              <option value="ems">EMS</option>
              <option value="tens">TENS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תוכנית</label>
            <input
              type="text"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תדירות</label>
            <input
              type="text"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">מרחק מקצה הגדם (ס"מ)</label>
            <input
              type="number"
              value={formData.distanceFromStump}
              onChange={(e) => setFormData({ ...formData, distanceFromStump: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תיאור התחושה</label>
            <textarea
              value={formData.sensation}
              onChange={(e) => setFormData({ ...formData, sensation: e.target.value })}
              className="w-full p-2 border rounded h-32"
              placeholder="היכן באיבר הפנטום הורגשה התחושה? איך הרגישה?"
            ></textarea>
          </div>

          {/* Image Grid (Edit Mode) */}
          {(point.imageUrls?.length || 0) > 0 || point.imageUrl ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">תמונות מצורפות</label>
              <div className="grid grid-cols-3 gap-2">
                {/* Legacy single image */}
                {point.imageUrl && (
                  <div className="relative aspect-square border rounded overflow-hidden group">
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
                      className="absolute top-1 right-1 bg-red-500 text-white p-2 rounded-full shadow-md z-10 hover:bg-red-600"
                      title="מחק תמונה"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {/* New multiple images */}
                {point.imageUrls?.map((url, index) => (
                  <div key={url} className="relative aspect-square border rounded overflow-hidden group">
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
                      className="absolute top-1 right-1 bg-red-500 text-white p-2 rounded-full shadow-md z-10 hover:bg-red-600"
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
              onClick={handleSave}
              className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              שמור
            </button>
            <button
              onClick={onClose} // Use onClose prop
              className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
          </div>

          {/* Delete Confirmation Modal (Edit Mode) */}
          {imageToDelete && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <h4 className="text-lg font-bold mb-4">מחיקת תמונה</h4>
                <p className="mb-6 text-gray-600">האם אתה בטוח שברצונך למחוק את התמונה?</p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmDeleteImage}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setImageToDelete(null)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
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
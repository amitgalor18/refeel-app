import React, { useRef, useState } from 'react';
import {
  Camera,
  Save,
  Trash2,
  Edit,
  Image as ImageIcon,
  CheckCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import type { ExamData, PointData } from '../firebaseUtils';
import { createPoint, updatePoint, deletePoint } from '../firebaseUtils';
import ModelViewer from './ModelViewer';
import CameraModal from './CameraModal';
import DescriptionModal from './DescriptionModal';

interface ExamPageProps {
  examData: ExamData | null;
  points: PointData[];
  selectedPoint: number | null;
  showDescriptionModal: boolean;
  showCameraModal: boolean;
  setSelectedPoint: (index: number | null) => void;
  setShowDescriptionModal: (show: boolean) => void;
  setShowCameraModal: (show: boolean) => void;
  setPoints: (points: PointData[] | ((prev: PointData[]) => PointData[])) => void;
}

const getModelFilenames = (exam: ExamData | null) => {
  if (!exam || !exam.limb) return { stumpFile: '', fullFile: '' };

  // exam.limb format: 'leg-right', 'leg-left', 'arm-right', 'arm-left'
  const [limbType, side] = exam.limb.split('-'); // e.g. ['leg', 'right']

  // Filenames are like: 'right-leg-full.obj'
  const filePrefix = `${side}-${limbType}`;

  const fullFile = `${filePrefix}-full.obj`;
  let stumpFile = '';

  if (exam.location) {
    // Handle specific file typo for left arm above elbow if needed
    // Based on file list: "left-arm-above-elbow..obj"
    if (filePrefix === 'left-arm' && exam.location === 'above-elbow') {
      stumpFile = 'left-arm-above-elbow..obj';
    } else {
      stumpFile = `${filePrefix}-${exam.location}.obj`;
    }
  }

  // Fallback to full file if stump file is not determined (e.g. no location)
  if (!stumpFile) stumpFile = fullFile;

  // Return just the filename, ModelViewer adds the /models/ prefix
  return {
    stumpFile: stumpFile,
    fullFile: fullFile
  };
};

const ExamPage: React.FC<ExamPageProps> = ({
  examData,
  points,
  selectedPoint,
  showDescriptionModal,
  showCameraModal,
  setSelectedPoint,
  setShowDescriptionModal,
  setShowCameraModal,
  setPoints,
}) => {
  const stumpViewerRef = useRef<HTMLDivElement>(null!);
  const fullLimbViewerRef = useRef<HTMLDivElement>(null!);
  const [isLimbViewOpen, setIsLimbViewOpen] = useState(true);
  const [descriptionModalViewMode, setDescriptionModalViewMode] = useState(false); // NEW: Control initial view mode

  const { stumpFile, fullFile } = getModelFilenames(examData);

  // NEW: Helper functions for uncommitted point logic
  const getUncommittedPointIndex = () => {
    return points.findIndex(p => typeof p.id === 'string' && p.id.startsWith('temp-'));
  };

  const hasUncommittedPoint = () => {
    return getUncommittedPointIndex() !== -1;
  };

  const getPointVisualState = (index: number) => {
    const point = points[index];
    if (!point) return { isUncommitted: false, isSelected: false };

    const isUncommitted = typeof point.id === 'string' && point.id.startsWith('temp-');
    const isSelected = index === selectedPoint;

    return { isUncommitted, isSelected };
  };



  // NEW: Handle stump clicks - move uncommitted or create new
  const handleStumpClick = (position: { x: number; y: number; z: number }) => {
    const uncommittedIndex = getUncommittedPointIndex();

    if (uncommittedIndex !== -1) {
      // Move the uncommitted point
      console.log('Moving uncommitted point to new position');
      const updatedPoints = [...points];
      updatedPoints[uncommittedIndex].stumpPosition = position;
      setPoints(updatedPoints);
      setSelectedPoint(uncommittedIndex);
    } else {
      // Create new uncommitted point
      if (points.length >= 10) {
        alert('הגעת למגבלת 10 נקודות');
        return;
      }

      console.log('Creating new uncommitted point');
      const newPoint: PointData = {
        id: `temp-${Date.now()}`, // Temporary ID
        stumpPosition: position,
        limbPosition: null,
        stimulationType: '',
        program: '',
        frequency: '',
        sensation: '',
        imageUrl: null,
        imageUrls: [],
        distanceFromStump: '',
        order: points.length + 1 // Assign order
      };
      setPoints([...points, newPoint]);
      setSelectedPoint(points.length);
    }
    // Implicit mapping mode - no explicit toggle needed
  };

  // UPDATED: Commit handler - saves point to Firebase
  const handleCommitPoint = async (pointToSaveOverride?: PointData) => {
    if (selectedPoint === null || !examData?.id) {
      alert('שגיאה: חסרים נתונים לשמירה');
      return;
    }

    const pointToSave = pointToSaveOverride || points[selectedPoint];
    const { id, examId, ...saveData } = pointToSave;

    if (!pointToSave.stumpPosition) {
      alert('שגיאה: מיקום נקודה חסר. נסה ללחוץ שוב.');
      return;
    }

    const cleanedData = {
      ...saveData,
      stumpPosition: { // This is now guaranteed to be non-null
        x: Number(pointToSave.stumpPosition.x),
        y: Number(pointToSave.stumpPosition.y),
        z: Number(pointToSave.stumpPosition.z)
      },
      limbPosition: pointToSave.limbPosition ? {
        x: Number(pointToSave.limbPosition.x),
        y: Number(pointToSave.limbPosition.y),
        z: Number(pointToSave.limbPosition.z)
      } : null,
      // Use nullish coalescing to preserve 0 if it exists, though we prefer 1-based.
      // Fallback to points.length + 1 for new points if order is missing.
      order: pointToSave.order ?? (points.length + 1)
    };

    try {
      if (typeof id === 'string' && id.startsWith('temp-')) {
        // Commit uncommitted point
        console.log('🆕 Committing uncommitted point...');
        const result = await createPoint(examData.id, cleanedData);
        // result is { id: string, createdAt: string }

        // Update local state with real ID using FUNCTIONAL UPDATE to avoid stale state
        setPoints((currentPoints) => {
          const updatedPoints = [...currentPoints];
          // Find the point by its temp ID (id from closure)
          const indexToUpdate = updatedPoints.findIndex(p => p.id === id);

          if (indexToUpdate !== -1) {
            updatedPoints[indexToUpdate] = {
              ...updatedPoints[indexToUpdate],
              id: result.id,
              createdAt: result.createdAt // Update createdAt immediately
            };
          }
          return updatedPoints;
        });

        console.log('Point saved successfully!');
        setSelectedPoint(null);

      } else if (typeof id === 'string') {
        // Update existing point
        console.log('📝 Updating existing point...');
        await updatePoint(examData.id, id, cleanedData);

        console.log('Point updated successfully!');
        setSelectedPoint(null);
      }
    } catch (error) {
      console.error('❌ Error saving point:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה בשמירת נקודה: ${errorMessage}`);
    }
  };

  const [deleteConfirmationIndex, setDeleteConfirmationIndex] = useState<number | null>(null);

  const handleDeletePoint = (indexToDelete: number) => {
    setDeleteConfirmationIndex(indexToDelete);
  };

  const confirmDelete = async () => {
    if (deleteConfirmationIndex === null) return;

    const indexToDelete = deleteConfirmationIndex;
    const pointToDelete = points[indexToDelete];

    console.log('🗑️ Confirmed delete for point:', {
      index: indexToDelete,
      id: pointToDelete.id,
      examId: examData?.id
    });

    try {
      // Only delete from Firebase if it's a saved point (not starting with temp-)
      if (typeof pointToDelete.id === 'string' && !pointToDelete.id.startsWith('temp-') && examData?.id) {
        console.log('🔥 Calling deletePoint on Firebase...', { examId: examData.id, pointId: pointToDelete.id });
        await deletePoint(examData.id, pointToDelete.id);
        console.log('✅ Firebase delete successful');
      } else {
        console.log('ℹ️ Skipping Firebase delete (temp point or missing examId)');
      }

      // Use functional update for safety
      setPoints(currentPoints => {
        const newPoints = currentPoints.filter((_, i) => i !== indexToDelete);
        // Re-assign order based on new index
        return newPoints.map((p, i) => ({ ...p, order: i + 1 }));
      });

      if (selectedPoint === indexToDelete) setSelectedPoint(null);

    } catch (error) {
      console.error('❌ Error deleting point:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה במחיקת נקודה: ${errorMessage}`);
    } finally {
      setDeleteConfirmationIndex(null);
    }
  };

  // NEW: Helper to generate visual points for viewers
  const getVisualPoints = (forLimb: boolean) => {
    return points
      .map((p, index) => {
        const position = forLimb ? p.limbPosition : p.stumpPosition;
        if (!position) return null;

        const { isUncommitted, isSelected } = getPointVisualState(index);

        // Determine color
        let color = 0xff0000; // Default Red

        // Logic:
        // 1. Stump: Blue if uncommitted
        // 2. Limb: Blue if selected (implicit mapping)
        const isBlue = (!forLimb && isUncommitted) || (forLimb && isSelected);

        if (isBlue) {
          color = 0x4169E1; // Blue
        } else if (isSelected) {
          color = 0xFFA500; // Orange for selected
        }

        // Determine size
        let size = 0.08;
        if (isSelected) size = 0.12;

        return {
          position,
          label: (index + 1).toString(), // Always use original index + 1
          color,
          size,
          opacity: isSelected ? 1.0 : 0.8
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  };

  const handleSaveDescription = async (updates: Partial<PointData>, shouldClose: boolean = true) => {
    if (selectedPoint === null) return;

    // 1. Update local state
    const updatedPoints = [...points];
    const mergedPoint = { ...updatedPoints[selectedPoint], ...updates };
    console.log('handleSaveDescription updating state:', {
      index: selectedPoint,
      prevImages: points[selectedPoint].imageUrls,
      newImages: mergedPoint.imageUrls
    });
    updatedPoints[selectedPoint] = mergedPoint;
    setPoints(updatedPoints);

    // 2. Close modal if requested
    if (shouldClose) {
      setShowDescriptionModal(false);
    }

    // 3. Commit to Firebase
    await handleCommitPoint(mergedPoint);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Banner */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-center">
          <img
            src="/logo_banner.png"
            alt="ReFeel Banner"
            className="h-16 object-contain"
          />
        </div>

        {/* Header Removed - Moved to TopBar */}

        {/* Instruction with hint about uncommitted point */}
        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 mb-4 text-center">
          <p className="text-lg font-semibold text-blue-800">
            {hasUncommittedPoint()
              ? 'נקודה כחולה טרם נשמרה - לחץ על האיבר השלם למיפוי, או לחץ "שמירה" להוספת פרטים'
              : 'בחרו נקודה על הגדם'}
          </p>
        </div>

        {/* 3D Models */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4">
          {/* Stump Model */}
          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h3 className="text-lg font-semibold mb-2 text-center">גדם</h3>
            <div ref={stumpViewerRef} className="w-full h-96 border rounded">
              <ModelViewer
                modelFile={stumpFile}
                visualPoints={getVisualPoints(false)}
                onPointSelect={handleStumpClick}
              />
            </div>
          </div>

          {/* --- COLLAPSIBLE Full Limb Model --- */}
          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            {/* Clickable Header */}
            <div
              className="flex justify-between items-center mb-2 cursor-pointer"
              onClick={() => setIsLimbViewOpen(!isLimbViewOpen)}
            >
              <h3 className="text-lg font-semibold text-center">איבר פנטום</h3>
              <ChevronDown
                size={20}
                className={`transition-transform duration-300 ${isLimbViewOpen ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Collapsible Content */}
            <div
              ref={fullLimbViewerRef}
              className={`w-full h-96 border rounded transition-all duration-300 ease-in-out overflow-hidden ${isLimbViewOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
              <ModelViewer
                modelFile={fullFile}
                visualPoints={getVisualPoints(true)}
                onPointSelect={
                  selectedPoint !== null
                    ? (position) => {
                      const updatedPoints = [...points];
                      updatedPoints[selectedPoint].limbPosition = position;
                      setPoints(updatedPoints);
                    }
                    : null
                }
              />
            </div>
          </div>
          {/* --- END COLLAPSIBLE --- */}
        </div>

        {/* Point Actions */}
        {selectedPoint !== null && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3">
              פעולות לנקודה נבחרת {selectedPoint + 1}
              {getPointVisualState(selectedPoint).isUncommitted && (
                <span className="text-blue-600 text-sm mr-2">(טרם נשמרה)</span>
              )}
            </h3>
            <div className="flex gap-3">
              <button
                disabled={((points[selectedPoint].imageUrls?.length || 0) + (points[selectedPoint].imageUrl ? 1 : 0)) >= 5}
                onClick={() => setShowCameraModal(true)}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-2 ${((points[selectedPoint].imageUrls?.length || 0) + (points[selectedPoint].imageUrl ? 1 : 0)) >= 5
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
              >
                <Camera size={18} />
                צילום
              </button>
              <button
                onClick={() => {
                  setDescriptionModalViewMode(false); // Edit mode
                  setShowDescriptionModal(true);
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                שמירה
              </button>
            </div>
          </div>
        )}

        {/* Points Table */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">נקודות שנבחרו ({points.length}/10)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-right">#</th>
                  {/* Removed Date and Status columns as requested */}
                  <th className="p-2 text-right">תיאור</th>
                  <th className="p-2 text-right">מיפוי</th>
                  <th className="p-2 text-right">תמונה</th>
                  <th className="p-2 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, idx) => {
                  const { isUncommitted, isSelected } = getPointVisualState(idx);
                  const rowClass = isSelected
                    ? 'bg-orange-50 border-l-4 border-orange-500'
                    : isUncommitted
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'border-t';

                  const imageCount = (point.imageUrls?.length || 0) + (point.imageUrl ? 1 : 0);

                  return (
                    <tr key={point.id} className={rowClass}>
                      <td className="p-2">{idx + 1}</td>
                      {/* Removed Date and Status cells */}
                      <td className="p-2">{point.sensation || '-'}</td>
                      <td className="p-2">
                        {point.limbPosition ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2">
                        {imageCount > 0 ? (
                          <button
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              // Open first image for now, or all in new tabs
                              const urls = [...(point.imageUrls || [])];
                              if (point.imageUrl) urls.unshift(point.imageUrl);
                              urls.forEach(url => window.open(url, '_blank'));
                            }}
                          >
                            <ImageIcon size={18} />
                            {imageCount > 1 && <span className="text-xs font-bold">{imageCount}</span>}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => setSelectedPoint(idx)}
                            title="בחר"
                            className={`text-sm ${isSelected
                              ? 'text-orange-600'
                              : 'text-gray-400 hover:text-orange-600'
                              }`}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPoint(idx);
                              setDescriptionModalViewMode(true); // View mode
                              setShowDescriptionModal(true);
                            }}
                            title="תיאור"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Info size={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePoint(idx)}
                            title="מחק"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {points.length === 0 && (
              <p className="text-center text-gray-500 py-8">לא נבחרו נקודות עדיין</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {deleteConfirmationIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full m-4">
            <h3 className="text-xl font-bold mb-4">מחיקת נקודה</h3>
            <p className="mb-6">האם אתה בטוח שברצונך למחוק את נקודה {deleteConfirmationIndex + 1}?</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirmationIndex(null)}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {showDescriptionModal && selectedPoint !== null && (
        <DescriptionModal
          point={points[selectedPoint]}
          examId={examData?.id || ''}
          therapistName={examData?.therapistName || 'לא ידוע'}
          initialViewMode={descriptionModalViewMode}
          onClose={() => setShowDescriptionModal(false)}
          onSave={handleSaveDescription}
        />
      )}
      {showCameraModal && selectedPoint !== null && (
        <CameraModal
          point={points[selectedPoint]}
          examId={examData?.id || ''}
          onClose={() => setShowCameraModal(false)}
          onSave={async (imageUrl) => {
            const updatedPoints = [...points];
            const point = updatedPoints[selectedPoint];

            // Append new image URL
            const currentImages = point.imageUrls || [];
            const updatedPoint = {
              ...point,
              imageUrls: [...currentImages, imageUrl]
            };

            updatedPoints[selectedPoint] = updatedPoint;

            setPoints(updatedPoints);
            setShowCameraModal(false);

            // Auto-save to Firebase
            await handleCommitPoint(updatedPoint);
          }}
        />
      )}
    </div>
  );
};

export default ExamPage;

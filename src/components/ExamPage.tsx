import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { BiSolidCamera, BiSolidSave, BiSolidCheckCircle, BiSolidImage, BiSolidInfoCircle, BiSolidTrash } from 'react-icons/bi';
import ModelViewer from './ModelViewer';
import CameraModal from './CameraModal';
import DescriptionModal from './DescriptionModal';
import type { PointData, ExamData } from '../firebaseUtils';
import { updatePoint, deletePoint, createPoint } from '../firebaseUtils';

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
  const [isAddPointMode, setIsAddPointMode] = useState(false); // NEW: Toggle for adding points

  const { stumpFile, fullFile } = getModelFilenames(examData);

  // NEW: Helper functions for uncommitted point logic
  const getUncommittedPointIndex = () => {
    return points.findIndex(p => typeof p.id === 'string' && p.id.startsWith('temp-'));
  };



  const getPointVisualState = (index: number) => {
    const point = points[index];
    if (!point) return { isUncommitted: false, isSelected: false };

    const isUncommitted = typeof point.id === 'string' && point.id.startsWith('temp-');
    const isSelected = index === selectedPoint;

    return { isUncommitted, isSelected };
  };



  // UPDATED: Handle stump clicks - select closest or create new
  const handleStumpClick = (position: { x: number; y: number; z: number }) => {
    if (isAddPointMode) {
      const uncommittedIndex = getUncommittedPointIndex();

      if (uncommittedIndex !== -1) {
        // Move the uncommitted point
        console.log('Moving uncommitted point to new position');
        const updatedPoints = [...points];
        updatedPoints[uncommittedIndex] = {
          ...updatedPoints[uncommittedIndex],
          stumpPosition: position,
          hasUnsavedChanges: true // Mark as modified
        };
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
          stimulationType: 'tens',
          program: '',
          frequency: '',
          sensation: '',
          imageUrl: null,
          imageUrls: [],
          distanceFromStump: '',
          order: points.length + 1, // Assign order
          hasUnsavedChanges: true // Mark as modified
        };
        setPoints([...points, newPoint]);
        setSelectedPoint(points.length);
      }
      // Note: We stay in add mode to allow adjusting the position
    } else {
      // Select closest point logic
      let closestIndex = -1;
      let minDistance = Infinity;
      const threshold = 3.0; // Increased to 3.0 for much easier selection

      points.forEach((point, index) => {
        if (!point.stumpPosition) return;
        const dx = point.stumpPosition.x - position.x;
        const dy = point.stumpPosition.y - position.y;
        const dz = point.stumpPosition.z - position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      if (closestIndex !== -1 && minDistance < threshold) {
        console.log('Selected closest point:', closestIndex);
        setSelectedPoint(closestIndex);
      } else {
        console.log('No point close enough to select');
      }
    }
  };

  // UPDATED: Commit handler - saves point to Firebase
  const handleCommitPoint = async (pointToSaveOverride?: PointData) => {
    if (selectedPoint === null || !examData?.id) {
      alert('שגיאה: חסרים נתונים לשמירה');
      return;
    }

    const pointToSave = pointToSaveOverride || points[selectedPoint];
    const { id, examId, hasUnsavedChanges, ...saveData } = pointToSave; // Exclude local flag

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
              createdAt: result.createdAt, // Update createdAt immediately
              hasUnsavedChanges: false // Clear flag
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

        // Update local state to clear flag
        setPoints((currentPoints) => {
          const updatedPoints = [...currentPoints];
          const indexToUpdate = updatedPoints.findIndex(p => p.id === id);
          if (indexToUpdate !== -1) {
            updatedPoints[indexToUpdate] = {
              ...updatedPoints[indexToUpdate],
              hasUnsavedChanges: false
            };
          }
          return updatedPoints;
        });

        console.log('Point updated successfully!');
        setSelectedPoint(null);
      }
    } catch (error) {
      console.error('❌ Error saving point:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה בשמירת נקודה: ${errorMessage}`);
    }
  };

  // NEW: Handle limb clicks - map point or select closest mapped
  const handleLimbClick = (position: { x: number; y: number; z: number }) => {
    // If a point is selected and we want to map it (e.g. it has no mapping yet)
    if (selectedPoint !== null && !points[selectedPoint].limbPosition) {
      const updatedPoints = [...points];
      updatedPoints[selectedPoint] = {
        ...updatedPoints[selectedPoint],
        limbPosition: position,
        hasUnsavedChanges: true // Mark as modified
      };
      setPoints(updatedPoints);
    } else {
      // Select closest mapped point
      let closestIndex = -1;
      let minDistance = Infinity;
      const threshold = 5.0; // Increased to 5.0 for very easy selection

      points.forEach((point, index) => {
        if (!point.limbPosition) return;
        const dx = point.limbPosition.x - position.x;
        const dy = point.limbPosition.y - position.y;
        const dz = point.limbPosition.z - position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      if (closestIndex !== -1 && minDistance < threshold) {
        console.log('Selected closest mapped point:', closestIndex);
        setSelectedPoint(closestIndex);
      }
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
    <div className="min-h-screen bg-bg-primary p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Banner Removed */}

        {/* Instruction with hint about uncommitted point */}
        <div className="bg-bg-secondary border border-accent-blue/30 rounded-lg p-3 mb-4 text-center">
          <p className="text-lg font-semibold text-accent-blue">
            {isAddPointMode
              ? 'בחר נקודה על הגדם'
              : selectedPoint !== null && !points[selectedPoint].limbPosition
                ? 'נקודה כחולה טרם נשמרה - לחץ על האיבר השלם למיפוי, או לחץ "שמירה" להוספת פרטים'
                : 'לחץ על נקודה קיימת לבחירה, או לחץ על ה- + להוספת נקודה חדשה'}
          </p>
        </div>

        {/* 3D Models */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4">
          {/* Stump Model */}
          <div className="bg-bg-secondary rounded-xl shadow p-2 md:p-4 border border-border-subtle relative">
            <h3 className="text-xl font-bold mb-4 text-center text-text-primary py-2">גדם</h3>
            <div ref={stumpViewerRef} className="w-full h-96 border border-border-subtle rounded bg-bg-primary relative">
              <ModelViewer
                modelFile={stumpFile}
                visualPoints={getVisualPoints(false)}
                onPointSelect={handleStumpClick}
              >
                {/* Add Point Toggle Button */}
                <div className="absolute top-24 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddPointMode(!isAddPointMode);
                      if (!isAddPointMode) setSelectedPoint(null); // Clear selection when entering add mode
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${isAddPointMode
                      ? 'bg-accent-blue text-white'
                      : 'bg-white/80 text-gray-600 hover:bg-white'
                      }`}
                    title={isAddPointMode ? 'בטל הוספת נקודה' : 'הוסף נקודה חדשה'}
                  >
                    <Plus size={20} className={isAddPointMode ? 'rotate-45 transition-transform' : 'transition-transform'} />
                  </button>
                </div>
              </ModelViewer>
            </div>
          </div>

          {/* --- COLLAPSIBLE Full Limb Model --- */}
          <div className="bg-bg-secondary rounded-xl shadow p-2 md:p-4 border border-border-subtle relative">
            {/* Clickable Header */}
            <div
              className="flex justify-between items-center mb-2 cursor-pointer py-2"
              onClick={() => setIsLimbViewOpen(!isLimbViewOpen)}
            >
              <div className="flex-1"></div>
              <h3 className="text-xl font-bold text-center text-text-primary">איבר פנטום</h3>
              <div className="flex-1 flex justify-end">
                <ChevronDown
                  size={24}
                  className={`transition-transform duration-300 text-text-primary ${isLimbViewOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {/* Collapsible Content */}
            <div
              ref={fullLimbViewerRef}
              className={`w-full h-96 border border-border-subtle rounded bg-bg-primary transition-all duration-300 ease-in-out overflow-hidden relative ${isLimbViewOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
              <ModelViewer
                modelFile={fullFile}
                visualPoints={getVisualPoints(true)}
                onPointSelect={handleLimbClick}
              >
                {/* Mapping Control Button */}
                <div className="absolute top-24 right-2 z-10">
                  <button
                    disabled={selectedPoint === null}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPoint !== null) {
                        const point = points[selectedPoint];
                        if (point.limbPosition) {
                          // Remove mapping
                          const updatedPoints = [...points];
                          updatedPoints[selectedPoint] = {
                            ...updatedPoints[selectedPoint],
                            limbPosition: null,
                            hasUnsavedChanges: true // Mark as modified
                          };
                          setPoints(updatedPoints);
                        } else {
                          // Enter mapping mode (implicit by having selection but no mapping)
                          // We might want a toast or visual cue here
                          alert('לחץ על המודל כדי למקם את הנקודה');
                        }
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${selectedPoint === null
                      ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                      : points[selectedPoint]?.limbPosition
                        ? 'bg-white/80 text-error hover:bg-white' // Minus (Remove)
                        : 'bg-white/80 text-accent-blue hover:bg-white' // Plus (Add)
                      }`}
                    title={
                      selectedPoint === null
                        ? 'בחר נקודה בגדם תחילה'
                        : points[selectedPoint]?.limbPosition
                          ? 'הסר מיפוי'
                          : 'הוסף מיפוי'
                    }
                  >
                    {selectedPoint !== null && points[selectedPoint]?.limbPosition ? (
                      <Minus size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                  </button>
                </div>
              </ModelViewer>
            </div>
          </div>
          {/* --- END COLLAPSIBLE --- */}
        </div>

        {/* Point Actions */}
        {selectedPoint !== null && (
          <div className="bg-bg-secondary rounded-xl shadow p-4 mb-4 border border-border-subtle">
            <h3 className="text-lg font-semibold mb-3 text-text-primary">
              פעולות לנקודה נבחרת {selectedPoint + 1}
              {getPointVisualState(selectedPoint).isUncommitted && (
                <span className="text-accent-blue text-sm mr-2">(טרם נשמרה)</span>
              )}
            </h3>
            <div className="flex gap-3">
              <button
                disabled={((points[selectedPoint].imageUrls?.length || 0) + (points[selectedPoint].imageUrl ? 1 : 0)) >= 5}
                onClick={() => setShowCameraModal(true)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${((points[selectedPoint].imageUrls?.length || 0) + (points[selectedPoint].imageUrl ? 1 : 0)) >= 5
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-bg-input text-text-primary hover:bg-gray-600'
                  }`}
              >
                <BiSolidCamera size={18} />
                צילום
              </button>
              <button
                onClick={() => {
                  setDescriptionModalViewMode(false); // Edit mode
                  setShowDescriptionModal(true);
                }}
                className="flex-1 bg-accent-blue text-white py-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <BiSolidSave size={18} />
                שמירה
              </button>
            </div>
          </div>
        )}

        {/* Points Table */}
        <div className="bg-bg-secondary rounded-xl shadow p-4 border border-border-subtle">
          <h3 className="text-lg font-semibold mb-3 text-text-primary">נקודות שנבחרו ({points.length}/10)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-text-primary border-separate border-spacing-y-2">
              <thead className="text-text-primary">
                <tr>
                  <th className="p-2 text-right">#</th>
                  <th className="p-2 text-right">תיאור</th>
                  <th className="p-2 text-right">מיפוי</th>
                  <th className="p-2 text-right">תמונה</th>
                  <th className="p-2 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, idx) => {
                  const { isUncommitted, isSelected } = getPointVisualState(idx);
                  const imageCount = (point.imageUrls?.length || 0) + (point.imageUrl ? 1 : 0);

                  return (
                    <tr
                      key={point.id}
                      onClick={() => setSelectedPoint(idx)}
                      className={`cursor-pointer transition-all duration-200 rounded-lg shadow-sm ${isSelected
                        ? 'bg-accent-blue/20'
                        : isUncommitted
                          ? 'bg-blue-900/30'
                          : 'bg-bg-input hover:bg-bg-input/80'
                        }`}
                    >
                      <td className="p-3 rounded-r-lg font-medium">{idx + 1}</td>
                      <td className="p-3 max-w-[150px] truncate" title={point.sensation || ''}>
                        {point.sensation || '-'}
                      </td>
                      <td className="p-3">
                        {point.limbPosition ? (
                          <BiSolidCheckCircle size={18} className="text-white" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3">
                        {imageCount > 0 ? (
                          <button
                            className="flex items-center gap-1 text-white hover:text-gray-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              const urls = [...(point.imageUrls || [])];
                              if (point.imageUrl) urls.unshift(point.imageUrl);
                              urls.forEach(url => window.open(url, '_blank'));
                            }}
                          >
                            <BiSolidImage size={18} />
                            {imageCount > 1 && <span className="text-xs font-bold">{imageCount}</span>}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 rounded-l-lg">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoint(idx);
                              setDescriptionModalViewMode(true); // View mode
                              setShowDescriptionModal(true);
                            }}
                            title="תיאור"
                            className="text-white hover:text-gray-300 p-1 rounded hover:bg-white/5 transition"
                          >
                            <BiSolidInfoCircle size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePoint(idx);
                            }}
                            title="מחק"
                            className="text-error hover:text-red-400 p-1 rounded hover:bg-white/5 transition"
                          >
                            <BiSolidTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {points.length === 0 && (
              <p className="text-center text-gray-400 py-8">לא נבחרו נקודות עדיין</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {
        deleteConfirmationIndex !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-bg-secondary rounded-xl p-6 max-w-sm w-full m-4 border border-border-subtle text-text-primary">
              <h3 className="text-xl font-bold mb-4 text-error">מחיקת נקודה</h3>
              <p className="mb-6">האם אתה בטוח שברצונך למחוק את נקודה {deleteConfirmationIndex + 1}?</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-error text-white py-2 rounded-lg hover:bg-red-600 transition"
                >
                  מחק
                </button>
                <button
                  onClick={() => setDeleteConfirmationIndex(null)}
                  className="flex-1 bg-bg-input text-text-primary py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showDescriptionModal && selectedPoint !== null && (
          <DescriptionModal
            point={points[selectedPoint]}
            examId={examData?.id || ''}
            therapistName={examData?.therapistName || 'לא ידוע'}
            initialViewMode={descriptionModalViewMode}
            onClose={() => setShowDescriptionModal(false)}
            onSave={handleSaveDescription}
          />
        )
      }
      {
        showCameraModal && selectedPoint !== null && (
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
        )
      }
    </div >
  );
};

export default ExamPage;

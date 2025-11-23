import React, { useRef, useState } from 'react';
import { Camera, Upload, Save, Trash2, Edit, Image as ImageIcon, CheckCircle, ChevronDown, Info } from 'lucide-react';
import type { ExamData, PointData } from '../firebaseUtils';
import { createPoint, updatePoint, deletePoint } from '../firebaseUtils';
import ModelViewer from './ModelViewer';
import CameraModal from './CameraModal';
import DescriptionModal from './DescriptionModal';

interface ExamPageProps {
  examData: ExamData | null;
  points: PointData[];
  selectedPoint: number | null;
  showMappingMode: boolean;
  showDescriptionModal: boolean;
  showCameraModal: boolean;
  setCurrentPage: (page: string) => void;
  setSelectedPoint: (index: number | null) => void;
  setShowDescriptionModal: (show: boolean) => void;
  setShowMappingMode: (show: boolean) => void;
  setShowCameraModal: (show: boolean) => void;
  setPoints: (points: PointData[]) => void;
}

const getModelFilenames = (exam: ExamData | null) => {
  if (!exam) return { stumpFile: '', fullFile: '' };

  let stumpFile = '';
  let fullFile = '';

  if (exam.limb?.includes('leg')) {
    fullFile = 'right-leg-full.obj';
  } else if (exam.limb?.includes('arm')) {
    fullFile = 'right-arm-full.obj';
  }

  if (exam.limb?.includes('leg')) {
    if (exam.location?.includes('below-knee')) {
      stumpFile = 'right-leg-below-knee.obj';
    } else if (exam.location?.includes('above-knee')) {
      stumpFile = 'right-leg-above-knee.obj';
    }
  } else if (exam.limb?.includes('arm')) {
    if (exam.location?.includes('below-elbow')) {
      stumpFile = 'right-arm-below-elbow.obj';
    } else if (exam.location?.includes('above-elbow')) {
      stumpFile = 'right-arm-above-elbow.obj';
    }
  }

  if (!stumpFile) stumpFile = fullFile;
  return { stumpFile, fullFile };
};

const ExamPage: React.FC<ExamPageProps> = ({
  examData,
  points,
  selectedPoint,
  setCurrentPage,
  setSelectedPoint,
  setPoints,
}) => {
  const stumpViewerRef = useRef<HTMLDivElement>(null!);
  const fullLimbViewerRef = useRef<HTMLDivElement>(null!);
  const [isLimbViewOpen, setIsLimbViewOpen] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [descriptionModalViewMode, setDescriptionModalViewMode] = useState(false); // NEW: Control initial view mode
  const [showMappingMode, setShowMappingMode] = useState(false);

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
      };
      setPoints([...points, newPoint]);
      setSelectedPoint(points.length);
    }
    // Auto-enter mapping mode
    setShowMappingMode(true);
  };

  // UPDATED: Save handler - commits uncommitted points
  const handleSavePoint = async () => {
    if (selectedPoint === null || !examData?.id) {
      alert('שגיאה: חסרים נתונים לשמירה');
      return;
    }

    const pointToSave = points[selectedPoint];
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
    };

    try {
      if (typeof id === 'string' && id.startsWith('temp-')) {
        // Commit uncommitted point
        console.log('🆕 Committing uncommitted point...');
        const newFirebaseId = await createPoint(examData.id, cleanedData);

        const updatedPoints = [...points];
        updatedPoints[selectedPoint].id = newFirebaseId;
        setPoints(updatedPoints);

        alert('נקודה נשמרה בהצלחה!');
        setSelectedPoint(null);

      } else if (typeof id === 'string') {
        // Update existing point
        console.log('📝 Updating existing point...');
        await updatePoint(examData.id, id, cleanedData);

        alert('נקודה עודכנה בהצלחה!');
        setSelectedPoint(null);
      }
    } catch (error) {
      console.error('❌ Error saving point:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה בשמירת נקודה: ${errorMessage}`);
    }
  };

  const handleDeletePoint = async (indexToDelete: number) => {
    const pointToDelete = points[indexToDelete];

    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את נקודה ${indexToDelete + 1}?`)) {
      return;
    }

    try {
      if (typeof pointToDelete.id === 'string' && examData?.id) {
        await deletePoint(examData.id, pointToDelete.id);
      }

      setPoints(points.filter((_, i) => i !== indexToDelete));
      if (selectedPoint === indexToDelete) setSelectedPoint(null);

    } catch (error) {
      console.error('Error deleting point:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה במחיקת נקודה: ${errorMessage}`);
    }
  };

  // NEW: Helper to generate visual points for viewers
  const getVisualPoints = (forLimb: boolean) => {
    return points
      .map((p, index) => {
        const position = forLimb ? p.limbPosition : p.stumpPosition;
        if (!position) return null;

        const isUncommitted = typeof p.id === 'string' && p.id.startsWith('temp-');
        const isSelected = index === selectedPoint;

        // Determine color
        let color = 0xff0000; // Default Red

        // Logic:
        // 1. Stump: Blue if uncommitted
        // 2. Limb: Blue ONLY if currently mapping (showMappingMode is true)
        const isBlue = (!forLimb && isUncommitted) || (forLimb && isSelected && showMappingMode);

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

  const handleSaveDescription = (updates: Partial<PointData>) => {
    if (selectedPoint === null) return;
    const updatedPoints = [...points];
    updatedPoints[selectedPoint] = { ...updatedPoints[selectedPoint], ...updates };
    setPoints(updatedPoints);
    setShowDescriptionModal(false);
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

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">ReFeel -  בדיקת מיפוי שגרתית</h1>
              <p className="text-sm text-gray-600">
                מטופל: {examData?.patientName} | ת.ז: {examData?.patientId} |
                מטפל: {examData?.therapistName} |
                תאריך: {examData ? new Date(examData.dateTime).toLocaleDateString('he-IL') : ''}
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('welcome')}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              סיים בדיקה
            </button>
          </div>
        </div>

        {/* Instruction with hint about uncommitted point */}
        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 mb-4 text-center">
          <p className="text-lg font-semibold text-blue-800">
            {showMappingMode
              ? 'בחרו נקודה תואמת על האיבר השלם'
              : hasUncommittedPoint()
                ? 'נקודה כחולה טרם נשמרה - לחץ על מיקום אחר להזיז אותה או לחץ "שמירה" לשמור'
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
              <h3 className="text-lg font-semibold text-center">איבר שלם</h3>
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
                  showMappingMode && selectedPoint !== null
                    ? (position) => {
                      const updatedPoints = [...points];
                      updatedPoints[selectedPoint].limbPosition = position;
                      setPoints(updatedPoints);
                      // Removed setShowMappingMode(false) to allow re-clicking
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
                onClick={() => {
                  if (selectedPoint !== null) {
                    setDescriptionModalViewMode(false); // Edit mode
                    setShowDescriptionModal(true);
                  } else {
                    alert('אנא בחר נקודה תחילה');
                  }
                }}
                className={`flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2`}
              >
                <Edit size={18} />
                תיאור
              </button>
              <button
                onClick={() => setShowMappingMode(!showMappingMode)}
                className={`flex-1 text-white py-2 rounded flex items-center justify-center gap-2 ${showMappingMode
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400'
                  : 'bg-gray-500 hover:bg-gray-600'
                  }`}
              >
                <Upload size={18} />
                {showMappingMode ? 'סיים מיפוי' : 'מיפוי'}
              </button>
              <button
                onClick={() => setShowCameraModal(true)}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                צילום
              </button>
              <button
                onClick={handleSavePoint}
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
                  <th className="p-2 text-right">מצב</th>
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

                  return (
                    <tr key={point.id} className={rowClass}>
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">
                        {isUncommitted ? (
                          <span className="text-blue-600 text-xs font-semibold">טרם נשמר</span>
                        ) : (
                          <span className="text-green-600 text-xs font-semibold">נשמר</span>
                        )}
                      </td>
                      <td className="p-2">{point.sensation || '-'}</td>
                      <td className="p-2">
                        {point.limbPosition ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2">
                        {point.imageUrl ? (
                          <CheckCircle size={18} className="text-green-500" />
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
                          {point.imageUrl && (
                            <button
                              onClick={() => window.open(point.imageUrl || '', '_blank')}
                              title="פתח תמונה"
                              className="text-green-600 hover:text-green-800"
                            >
                              <ImageIcon size={18} />
                            </button>
                          )}
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
      {showDescriptionModal && selectedPoint !== null && (
        <DescriptionModal
          point={points[selectedPoint]}
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
          onSave={(imageUrl) => {
            const updatedPoints = [...points];
            updatedPoints[selectedPoint].imageUrl = imageUrl;
            setPoints(updatedPoints);
            setShowCameraModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ExamPage;
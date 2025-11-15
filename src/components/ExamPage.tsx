import React, { useRef } from 'react';
import { Camera, Upload, Save, Trash2, Edit, Image as ImageIcon, CheckCircle } from 'lucide-react';
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
  showMappingMode,
  showDescriptionModal,
  showCameraModal,
  setCurrentPage,
  setSelectedPoint,
  setShowDescriptionModal,
  setShowMappingMode,
  setShowCameraModal,
  setPoints,
}) => {
  const stumpViewerRef = useRef<HTMLDivElement>(null!);
  const fullLimbViewerRef = useRef<HTMLDivElement>(null!);

  const { stumpFile, fullFile } = getModelFilenames(examData);

  // NEW: Helper functions for uncommitted point logic
  const getUncommittedPointIndex = () => {
    return points.findIndex(p => typeof p.id === 'number');
  };

  const hasUncommittedPoint = () => {
    return getUncommittedPointIndex() !== -1;
  };

  const getPointVisualState = (index: number) => {
    const point = points[index];
    const isUncommitted = typeof point.id === 'number';
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
        id: Date.now(),
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
      if (typeof id === 'number') {
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

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">ReFeel - בדיקת מיפוי</h1>
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Stump Model */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2 text-center">גדם</h3>
            <div ref={stumpViewerRef} className="w-full h-96 border rounded">
              <ModelViewer
                containerRef={stumpViewerRef}
                modelFile={stumpFile}
                selectedPoints={points.map((p) => p.stumpPosition)}
                onPointSelect={handleStumpClick}
                selectedPointIndex={selectedPoint}
                uncommittedPointIndex={getUncommittedPointIndex()}
              />
            </div>
          </div>

          {/* Full Limb Model */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2 text-center">איבר שלם</h3>
            <div ref={fullLimbViewerRef} className="w-full h-96 border rounded">
              <ModelViewer
                containerRef={fullLimbViewerRef}
                modelFile={fullFile}
                selectedPoints={points
                  .filter((p) => p.limbPosition)
                  .map((p) => p.limbPosition)}
                onPointSelect={
                  showMappingMode && selectedPoint !== null
                    ? (position) => {
                        const updatedPoints = [...points];
                        updatedPoints[selectedPoint].limbPosition = position;
                        setPoints(updatedPoints);
                        setShowMappingMode(false);
                      }
                    : null
                }
                selectedPointIndex={selectedPoint}
                uncommittedPointIndex={null}
              />
            </div>
          </div>
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
                onClick={() => setShowDescriptionModal(true)}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                תיאור
              </button>
              <button
                onClick={() => setShowMappingMode(true)}
                className="flex-1 bg-purple-500 text-white py-2 rounded hover:bg-purple-600 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                מיפוי
              </button>
              <button
                onClick={() => setShowCameraModal(true)}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                צילום
              </button>
              <button
                onClick={handleSavePoint}
                className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 flex items-center justify-center gap-2"
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
                  <th className="p-2 text-right">מס'</th>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedPoint(idx)}
                            className={`text-sm ${
                              isSelected 
                                ? 'font-bold text-orange-600' 
                                : 'text-gray-600 hover:text-orange-600'
                            }`}
                          >
                            בחר
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPoint(idx);
                              setShowDescriptionModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            תיאור
                          </button>
                          {point.imageUrl && (
                            <button
                              onClick={() => window.open(point.imageUrl || '', '_blank')}
                              className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                            >
                              <ImageIcon size={14} />
                              פתח
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePoint(idx)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            מחק
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
          onClose={() => setShowDescriptionModal(false)}
          onSave={(updates) => {
            const updatedPoints = [...points];
            updatedPoints[selectedPoint] = { ...updatedPoints[selectedPoint], ...updates };
            setPoints(updatedPoints);
            setShowDescriptionModal(false);
          }}
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
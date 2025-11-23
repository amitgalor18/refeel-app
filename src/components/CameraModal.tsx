import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Loader } from 'lucide-react';
import type { PointData } from '../firebaseUtils.ts';
import { uploadPointImage } from '../firebaseUtils.ts'; // Import the upload function

interface CameraModalProps {
  point: PointData;
  examId: string;
  onClose: () => void;
  onSave: (imageUrl: string) => void; // Passes back the download URL
}

const CameraModal: React.FC<CameraModalProps> = ({
  point,
  examId,
  onClose,
  onSave
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      // Use 'ideal' to prefer back camera but allow fallback to front automatically
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert('לא ניתן לגשת למצלמה');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
      }
    }
  };

  const savePhoto = async () => {
    if (!capturedImage) return;

    // Allow photo before saving - create temporary ID if needed
    let pointId = point.id;
    if (typeof pointId !== 'string') {
      // Create a temporary ID for unsaved points
      pointId = `temp_${point.id}`;
    }

    setIsLoading(true);
    try {
      // Upload to Firebase Storage and get URL
      const downloadUrl = await uploadPointImage(examId, pointId, capturedImage);

      // Pass the URL back to ExamPage
      onSave(downloadUrl);

    } catch (error) {
      console.error("Error uploading image: ", error);
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setIsLoading(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera(); // Cleanup on unmount
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4">
        <h3 className="text-xl font-bold mb-4">צילום</h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="animate-spin text-blue-500" size={48} />
            <p className="mt-4">מעלה תמונה...</p>
          </div>
        ) : !capturedImage ? (
          <div>
            <video ref={videoRef} autoPlay className="w-full rounded mb-4 bg-gray-900"></video>
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                צלם
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div>
            <img src={capturedImage} alt="Captured" className="w-full rounded mb-4" />
            <div className="flex gap-3">
              <button
                onClick={savePhoto}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                שמור תמונה
              </button>
              <button
                onClick={() => setCapturedImage(null)}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                צלם שוב
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      </div>
    </div>
  );
};

export default CameraModal;
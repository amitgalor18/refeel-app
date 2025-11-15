import React, { useState, useEffect } from 'react';
import type { PointData } from '../firebaseUtils.ts';

interface DescriptionModalProps {
  point: PointData; // Pass the specific point
  onClose: () => void;
  onSave: (updates: Partial<PointData>) => void; // Pass back an object with updates
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({
  point,
  onClose,
  onSave
}) => {
  // Local state for the form, initialized from the point prop
  const [formData, setFormData] = useState({
    stimulationType: point.stimulationType || '',
    program: point.program || '',
    frequency: point.frequency || '',
    sensation: point.sensation || ''
  });

  // Update local state if the selected point changes
  useEffect(() => {
    setFormData({
      stimulationType: point.stimulationType || '',
      program: point.program || '',
      frequency: point.frequency || '',
      sensation: point.sensation || ''
    });
  }, [point]);

  const handleSave = () => {
    // Pass all form data back to ExamPage
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4">
        <h3 className="text-xl font-bold mb-4">תיאור נקודה</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">סוג גירוי</label>
            <select
              value={formData.stimulationType}
              onChange={(e) => setFormData({...formData, stimulationType: e.target.value})}
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
              onChange={(e) => setFormData({...formData, program: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תדירות</label>
            <input
              type="text"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תיאור התחושה</label>
            <textarea
              value={formData.sensation}
              onChange={(e) => setFormData({...formData, sensation: e.target.value})}
              className="w-full p-2 border rounded h-32"
              placeholder="היכן באיבר הפנטום הורגשה התחושה? איך הרגישה?"
            ></textarea>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default DescriptionModal;
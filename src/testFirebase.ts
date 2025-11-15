import { createExam } from './firebaseUtils.ts';

async function testFirebase() {
  try {
    const examId = await createExam({
      patientName: 'Test Patient',
      patientId: '123456789',
      limb: 'leg-right',
      location: 'above-knee',
      therapistName: 'Dr. Test',
      dateTime: new Date().toISOString()
    });
    
    console.log('✅ Firebase working! Exam ID:', examId);
    
    // Check Firebase Console → Firestore Database
    // You should see the new exam document
  } catch (error) {
    console.error('❌ Firebase error:', error);
  }
}

testFirebase();
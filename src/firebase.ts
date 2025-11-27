// src/firebase.ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
// !! Get this from your Firebase project settings !!
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// --- ERROR HANDLING FOR MISSING KEYS ---
let configError: string | null = null;

if (!firebaseConfig.apiKey) {
  configError = `
    CRITICAL ERROR: Firebase configuration is missing.
    
    If you are running locally:
    1. Make sure you have a .env file in the root folder.
    2. Check that VITE_API_KEY and other variables are defined in it.
    
    If you are deploying:
    Make sure you have added the Environment Variables in your deployment settings (e.g., Vercel).
  `;

  console.error(configError);
}

export { configError };

// Initialize Firebase
// We only initialize if there's no error to avoid crashes
export let app: FirebaseApp;
export let db: Firestore;
export let auth: Auth;

if (!configError) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  // These will be undefined if config is missing, but the app should show the error screen
  // before accessing them.
  app = {} as FirebaseApp;
  db = {} as Firestore;
  auth = {} as Auth;
}
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import localConfig from '../../firebase-applet-config.json';

// Support Vercel env vars as primary overrides, fallback to local firebase-applet-config.json
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || localConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || localConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || localConfig.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || localConfig.measurementId || ""
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

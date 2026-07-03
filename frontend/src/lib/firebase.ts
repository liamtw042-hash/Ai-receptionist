import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Defensive init: with a missing/invalid VITE_FIREBASE_* env this module used
// to throw at import time, which killed the whole bundle before React mounted
// — every page (including pure marketing pages that never touch Firebase)
// rendered as a black screen. Fail soft instead: auth-dependent features
// break loudly in the console, everything else keeps working.
let app: ReturnType<typeof initializeApp>;
let authInstance: ReturnType<typeof getAuth>;
let dbInstance: ReturnType<typeof getFirestore>;
try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
} catch (err) {
  console.error('Firebase failed to initialise — check VITE_FIREBASE_* env vars:', err);
  app = undefined as unknown as ReturnType<typeof initializeApp>;
  authInstance = undefined as unknown as ReturnType<typeof getAuth>;
  dbInstance = undefined as unknown as ReturnType<typeof getFirestore>;
}

export const auth = authInstance;
export const db = dbInstance;
export default app;

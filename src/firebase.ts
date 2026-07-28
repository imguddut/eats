import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqowECXURTjKodLZAShYd8gduQhuy1fBc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "arwaleats-bd07c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "arwaleats-bd07c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "arwaleats-bd07c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "209914839614",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:209914839614:web:a3b1bd371e918f27eac76f"
};

// Check if credentials are set
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Initialize Firebase App singleton
const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

// Initialize Firebase Auth singleton
export const auth = getAuth(app);

// Helper to initialize persistence once during app startup
let persistencePromise: Promise<void> | null = null;
export async function initFirebasePersistence(): Promise<void> {
  if (!isFirebaseConfigured) {
    return;
  }
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("[Firebase] Persistence initialization error:", err);
    });
  }
  return persistencePromise;
}

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;

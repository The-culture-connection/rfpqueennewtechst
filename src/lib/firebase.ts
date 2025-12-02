// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics (only in browser environment)
// Analytics must be initialized lazily in Next.js to avoid SSR issues
let analytics: Analytics | null = null;

export function getAnalyticsInstance(): Analytics | null {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (analytics) {
    return analytics;
  }

  // Initialize if measurementId is available
  try {
    const measurementId = firebaseConfig.measurementId || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    
    if (measurementId) {
      analytics = getAnalytics(app);
      console.log('[Analytics] ✅ Initialized successfully with measurementId:', measurementId);
      return analytics;
    } else {
      console.warn('[Analytics] ⚠️ measurementId is missing. Analytics will not work.');
      console.warn('[Analytics] ⚠️ Check that NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set in Railway environment variables.');
      console.warn('[Analytics] ⚠️ firebaseConfig.measurementId:', firebaseConfig.measurementId);
      console.warn('[Analytics] ⚠️ process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
      return null;
    }
  } catch (error) {
    console.error('[Analytics] ❌ Failed to initialize:', error);
    return null;
  }
}

// Analytics will be initialized by AnalyticsInitializer component
// This ensures it only runs client-side after React hydration

export { app, auth, db, storage, analytics };


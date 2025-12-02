// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize Firebase if API key is available
// This prevents build-time errors when env vars aren't set
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let analytics: Analytics | null = null;

// Initialize Firebase only if API key is present
if (firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    // During build, this might fail - log but don't throw
    if (typeof window !== 'undefined') {
      console.error('[Firebase] Failed to initialize:', error);
    }
    // Set to null so we can check later
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

// Initialize Analytics (only in browser environment)
// Analytics must be initialized lazily in Next.js to avoid SSR issues
export function getAnalyticsInstance(): Analytics | null {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (analytics) {
    return analytics;
  }

  // Need app to be initialized first
  if (!app) {
    console.warn('[Analytics] ⚠️ Firebase app not initialized. Analytics cannot be initialized.');
    return null;
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
      return null;
    }
  } catch (error) {
    console.error('[Analytics] ❌ Failed to initialize:', error);
    return null;
  }
}

// Export Firebase instances
// These will be null during build if API key is missing, but that's okay
// They'll be initialized at runtime when the app starts
export { app, auth, db, storage, analytics };

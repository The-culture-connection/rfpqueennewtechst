// Firebase configuration and initialization
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Internal state
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _analytics: Analytics | null = null;
let _functions: Functions | null = null;

// Initialize Firebase
function initializeFirebase() {
  if (_app) return; // Already initialized

  if (!firebaseConfig.apiKey) {
    // During build, this is expected - return without initializing
    if (typeof window === 'undefined') {
      return;
    }
    // At runtime, throw an error
    throw new Error('Firebase API key is missing. Please set NEXT_PUBLIC_FIREBASE_API_KEY environment variable.');
  }

  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _storage = getStorage(_app);
    _functions = getFunctions(_app, 'us-central1');
  } catch (error) {
    // During build, this might fail - log but don't throw
    if (typeof window !== 'undefined') {
      console.error('[Firebase] Failed to initialize:', error);
      throw error;
    }
    // During build, just set to null
    _app = null;
    _auth = null;
    _db = null;
    _storage = null;
    _functions = null;
  }
}

// Try to initialize on module load (will fail silently during build)
initializeFirebase();

// Getter functions that ensure Firebase is initialized
// These throw helpful errors if Firebase isn't available
function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    initializeFirebase();
    if (!_app) {
      throw new Error('Firebase app is not initialized. This should not happen at runtime.');
    }
  }
  return _app;
}

function getFirebaseAuth(): Auth {
  if (!_auth) {
    initializeFirebase();
    if (!_auth) {
      throw new Error('Firebase auth is not initialized. This should not happen at runtime.');
    }
  }
  return _auth;
}

function getFirebaseFirestore(): Firestore {
  if (!_db) {
    initializeFirebase();
    if (!_db) {
      throw new Error('Firebase Firestore is not initialized. This should not happen at runtime.');
    }
  }
  return _db;
}

function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    initializeFirebase();
    if (!_storage) {
      throw new Error('Firebase Storage is not initialized. This should not happen at runtime.');
    }
  }
  return _storage;
}

function getFirebaseFunctions(): Functions {
  if (!_functions) {
    initializeFirebase();
    if (!_functions) {
      throw new Error('Firebase Functions is not initialized. This should not happen at runtime.');
    }
  }
  return _functions;
}

// Export getters for explicit use
export { getFirebaseApp, getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage, getFirebaseFunctions, httpsCallable };

// For backward compatibility, export direct references
// These use getters that initialize on first access
// During build, TypeScript sees them as non-null (via type assertions)
// At runtime, they will be properly initialized by the getters
export const app: FirebaseApp = (() => {
  try {
    return getFirebaseApp();
  } catch {
    // During build, return a dummy object to satisfy TypeScript
    // At runtime, the getter will throw if Firebase isn't initialized
    return {} as FirebaseApp;
  }
})();

export const auth: Auth = (() => {
  try {
    return getFirebaseAuth();
  } catch {
    return {} as Auth;
  }
})();

export const db: Firestore = (() => {
  try {
    return getFirebaseFirestore();
  } catch {
    return {} as Firestore;
  }
})();

export const storage: FirebaseStorage = (() => {
  try {
    return getFirebaseStorage();
  } catch {
    return {} as FirebaseStorage;
  }
})();

// Initialize Analytics (only in browser environment)
export function getAnalyticsInstance(): Analytics | null {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (_analytics) {
    return _analytics;
  }

  // Need app to be initialized first
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    console.warn('[Analytics] ⚠️ Firebase app not initialized. Analytics cannot be initialized.');
    return null;
  }

  // Initialize if measurementId is available
  try {
    const measurementId = firebaseConfig.measurementId || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    
    if (measurementId) {
      _analytics = getAnalytics(firebaseApp);
      console.log('[Analytics] ✅ Initialized successfully with measurementId:', measurementId);
      return _analytics;
    } else {
      console.warn('[Analytics] ⚠️ measurementId is missing. Analytics will not work.');
      return null;
    }
  } catch (error) {
    console.error('[Analytics] ❌ Failed to initialize:', error);
    return null;
  }
}

// Export analytics for backward compatibility
export const analytics = _analytics;

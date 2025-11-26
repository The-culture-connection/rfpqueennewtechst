// Firebase Admin SDK initialization (server-side only)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App;

export function getAdminApp() {
  if (getApps().length === 0) {
    // Get and validate credentials
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
      const missing = [];
      if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      if (!storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      throw new Error(`Missing Firebase Admin credentials: ${missing.join(', ')}`);
    }

    // Handle private key formatting - convert literal \n to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Initialize with service account credentials
    // ✅ Explicitly configure all endpoints to prevent localhost/private IP resolution
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId, // Explicitly set project ID
      storageBucket,
      // Explicitly set database URL to prevent emulator connection
      databaseURL: `https://${projectId}.firebaseio.com`,
    });
  } else {
    adminApp = getApps()[0];
  }
  
  return adminApp;
}

export function getAdminFirestore() {
  const app = getAdminApp();
  return getFirestore(app);
}

export function getAdminStorage() {
  const app = getAdminApp();
  return getStorage(app);
}


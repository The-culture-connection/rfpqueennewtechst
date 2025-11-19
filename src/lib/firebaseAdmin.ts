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

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials. Check your .env.local file.');
    }

    // Handle private key formatting - convert literal \n to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Initialize with service account credentials
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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


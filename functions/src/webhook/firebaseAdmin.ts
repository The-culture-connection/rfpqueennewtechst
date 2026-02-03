/**
 * Firebase Admin initialization
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

export function getAdminStorage(): admin.storage.Storage {
  return admin.storage();
}

export { admin };

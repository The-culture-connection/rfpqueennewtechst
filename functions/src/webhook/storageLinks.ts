/**
 * Generate signed download URLs for Cloud Storage objects
 */

import { getAdminStorage } from './firebaseAdmin';

const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Generate signed download URL for a storage object
 */
export async function generateSignedDownloadUrl(
  bucketName: string,
  objectPath: string,
  expiresInDays: number = DEFAULT_EXPIRY_DAYS
): Promise<{ downloadUrl: string; expiresAt: string }> {
  const storage = getAdminStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectPath);

  // Generate signed URL
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  });

  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    downloadUrl: signedUrl,
    expiresAt,
  };
}

/**
 * Extract bucket and object path from storage URL
 */
export function parseStorageUrl(storageUrl: string): {
  bucket: string;
  objectPath: string;
} | null {
  // Handle gs:// URLs
  if (storageUrl.startsWith('gs://')) {
    const match = storageUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (match) {
      return {
        bucket: match[1],
        objectPath: match[2],
      };
    }
  }

  // Handle https://storage.googleapis.com URLs
  if (storageUrl.includes('storage.googleapis.com')) {
    const match = storageUrl.match(/https:\/\/([^/]+)\.storage\.googleapis\.com\/(.+)$/);
    if (match) {
      return {
        bucket: match[1],
        objectPath: match[2],
      };
    }
  }

  // Handle Firebase Storage download URLs
  if (storageUrl.includes('firebasestorage.googleapis.com')) {
    const match = storageUrl.match(/\/o\/([^?]+)/);
    if (match) {
      const objectPath = decodeURIComponent(match[1]);
      // Extract bucket from URL or use default
      const bucketMatch = storageUrl.match(/\/v0\/b\/([^/]+)/);
      const bucket = bucketMatch
        ? bucketMatch[1]
        : process.env.STORAGE_BUCKET || 'therfpqueen-f11fd.appspot.com';
      return {
        bucket,
        objectPath,
      };
    }
  }

  return null;
}

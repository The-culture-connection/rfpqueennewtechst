import { doc, getDoc, setDoc, collection, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Opportunity, UserProfile } from '@/types';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DOCUMENT_SIZE = 900000; // ~900KB per document (safety margin under 1MB limit)
const CHUNK_SIZE = 30; // Number of opportunities per chunk (conservative to stay under 1MB)

interface CachedOpportunitiesChunk {
  chunkIndex: number;
  opportunities: Opportunity[];
  cachedAt: Timestamp;
}

interface CacheMetadata {
  totalChunks: number;
  cachedAt: Timestamp;
  profileHash: string;
  allOpportunitiesCount: number;
  matchedOpportunitiesCount: number;
}

/**
 * Generate a hash of the profile to detect changes
 */
function generateProfileHash(profile: UserProfile): string {
  return JSON.stringify({
    fundingType: profile.fundingType || [],
    interestsMain: profile.interestsMain || [],
    keywords: profile.keywords || [],
    entityType: profile.entityType,
    timeline: profile.timeline,
    hasBusinessProfile: !!profile.businessProfile,
    hasPreferences: !!profile.preferences,
  });
}

/**
 * Get cached opportunities from Firestore (chunked storage)
 */
export async function getCachedOpportunities(
  userId: string,
  profile: UserProfile
): Promise<{ allOpportunities: Opportunity[]; matchedOpportunities: Opportunity[] } | null> {
  if (!db || !userId) return null;

  try {
    // First, get metadata
    const metadataRef = doc(db, 'profiles', userId, 'cache', 'metadata');
    const metadataDoc = await getDoc(metadataRef);

    if (!metadataDoc.exists()) {
      console.log('[Cache] No cached opportunities metadata found');
      return null;
    }

    const metadata = metadataDoc.data() as CacheMetadata;
    const currentProfileHash = generateProfileHash(profile);

    // Check if profile has changed
    if (metadata.profileHash !== currentProfileHash) {
      console.log('[Cache] Profile changed, invalidating cache');
      await clearOpportunityCache(userId);
      return null;
    }

    // Check if cache is expired
    const cachedAt = metadata.cachedAt.toMillis();
    const now = Date.now();
    const age = now - cachedAt;

    if (age > CACHE_DURATION_MS) {
      console.log(`[Cache] Cache expired (${Math.round(age / (60 * 60 * 1000))} hours old)`);
      await clearOpportunityCache(userId);
      return null;
    }

    // Load all chunks
    // Path structure: profiles (collection) / {userId} (document) / cache (collection) / chunks (document) / opportunities (collection) / {chunkId} (document)
    // But we'll use: profiles/{userId}/cache/chunks/{chunkId}
    // Actually, let's use: profiles/{userId}/cache/{cacheDoc}/chunks/{chunkId}
    // Or simpler: profiles/{userId}/cacheChunks/{chunkId}
    const chunksRef = collection(db, 'profiles', userId, 'cacheChunks');
    const chunksSnapshot = await getDocs(chunksRef);
    
    if (chunksSnapshot.empty) {
      console.log('[Cache] No opportunity chunks found');
      return null;
    }

    // Sort chunks by index and combine
    const chunks = chunksSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as CachedOpportunitiesChunk }))
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Separate all and matched opportunities
    const allOpportunities: Opportunity[] = [];
    const matchedOpportunities: Opportunity[] = [];

    for (const chunk of chunks) {
      for (const opp of chunk.opportunities) {
        allOpportunities.push(opp);
        // Check if it's a matched opportunity (has matchScore >= 35)
        if ((opp.matchScore || opp.winRate || 0) >= 35) {
          matchedOpportunities.push(opp);
        }
      }
    }

    console.log(`[Cache] Using cached opportunities (${Math.round(age / (60 * 1000))} minutes old, ${chunks.length} chunks)`);
    return {
      allOpportunities,
      matchedOpportunities,
    };
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Estimate size of a chunk in bytes (rough estimate)
 */
function estimateChunkSize(chunk: Opportunity[]): number {
  const json = JSON.stringify(chunk);
  return new Blob([json]).size;
}

/**
 * Save opportunities to Firestore cache (chunked to avoid 1MB limit)
 */
export async function saveCachedOpportunities(
  userId: string,
  profile: UserProfile,
  allOpportunities: Opportunity[],
  matchedOpportunities: Opportunity[]
): Promise<void> {
  if (!db || !userId) return;

  try {
    // Clear existing cache first
    await clearOpportunityCache(userId);

    const profileHash = generateProfileHash(profile);
    const now = Timestamp.now();

    // Save metadata
    const metadataRef = doc(db, 'profiles', userId, 'cache', 'metadata');
    const metadata: CacheMetadata = {
      totalChunks: 0, // Will update after calculating
      cachedAt: now,
      profileHash,
      allOpportunitiesCount: allOpportunities.length,
      matchedOpportunitiesCount: matchedOpportunities.length,
    };

    // Split all opportunities into chunks
    // Use fixed chunk size for simplicity and reliability
    const chunks: Opportunity[][] = [];
    
    for (let i = 0; i < allOpportunities.length; i += CHUNK_SIZE) {
      const chunk = allOpportunities.slice(i, i + CHUNK_SIZE);
      
      // Verify chunk size is under limit (safety check)
      const chunkSize = estimateChunkSize(chunk);
      if (chunkSize > MAX_DOCUMENT_SIZE) {
        // If chunk is too large, split it further
        const halfSize = Math.floor(chunk.length / 2);
        chunks.push(chunk.slice(0, halfSize));
        chunks.push(chunk.slice(halfSize));
      } else {
        chunks.push(chunk);
      }
    }

    // Save chunks
    // Path: profiles/{userId}/cacheChunks/{chunkId}
    // This gives us: profiles (1) / userId (2) / cacheChunks (3) / chunkId (4) - valid!
    const chunksRef = collection(db, 'profiles', userId, 'cacheChunks');
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkRef = doc(chunksRef);
      const chunkData: CachedOpportunitiesChunk = {
        chunkIndex: i,
        opportunities: chunks[i],
        cachedAt: now,
      };
      await setDoc(chunkRef, chunkData);
    }

    // Update metadata with actual chunk count
    metadata.totalChunks = chunks.length;
    await setDoc(metadataRef, metadata);

    console.log(`[Cache] Saved ${allOpportunities.length} opportunities to Firestore cache in ${chunks.length} chunks`);
  } catch (error) {
    console.error('[Cache] Error saving cache:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Invalidate the cache for a user (e.g., when profile is updated)
 */
export async function invalidateOpportunityCache(userId: string): Promise<void> {
  if (!db || !userId) return;

  try {
    // Clear the entire cache
    await clearOpportunityCache(userId);
    console.log('[Cache] Invalidated opportunity cache');
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error);
  }
}

/**
 * Clear the cache for a user (deletes all chunks and metadata)
 */
export async function clearOpportunityCache(userId: string): Promise<void> {
  if (!db || !userId) return;

  try {
    // Delete all chunks
    // Path: profiles/{userId}/cacheChunks/{chunkId}
    const chunksRef = collection(db, 'profiles', userId, 'cacheChunks');
    const chunksSnapshot = await getDocs(chunksRef);
    
    const deletePromises = chunksSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete metadata
    const metadataRef = doc(db, 'profiles', userId, 'cache', 'metadata');
    const metadataDoc = await getDoc(metadataRef);
    if (metadataDoc.exists()) {
      await deleteDoc(metadataRef);
    }

    console.log(`[Cache] Cleared opportunity cache (deleted ${chunksSnapshot.docs.length} chunks)`);
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}


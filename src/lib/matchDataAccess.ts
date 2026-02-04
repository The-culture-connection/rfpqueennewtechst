// Data access layer for match runs and user signals
// Handles Firestore reads/writes for the new matching system

import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { UserProfile, MatchRun, CurrentMatches, UserOpportunitySignal, MatchTrigger, TopMatch } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Check if matching should run for a user
 * Checks both users and profiles collections for version info
 */
export async function shouldRunMatching(userId: string): Promise<{
  shouldRun: boolean;
  reason: MatchTrigger | null;
  currentProfileVersion?: number;
  currentDocsVersion?: number;
}> {
  const db = getAdminFirestore();
  
  try {
    // Check if current matches exist first
    const currentMatchesRef = db.collection('userMatches').doc(userId).collection('current').doc('latest');
    const currentMatchesDoc = await currentMatchesRef.get();
    
    if (!currentMatchesDoc.exists) {
      return { shouldRun: true, reason: 'FIRST_DASHBOARD' };
    }
    
    // Get version info from profiles collection (primary) or users collection (sync)
    const profileRef = db.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    // Prefer profiles collection, fallback to users
    const versionData = profileDoc.exists 
      ? profileDoc.data() 
      : (userDoc.exists ? userDoc.data() : null);
    
    if (!versionData) {
      return { shouldRun: true, reason: 'FIRST_DASHBOARD' };
    }
    
    const profileVersion = versionData?.profileVersion || 1;
    const docsVersion = versionData?.docsVersion || 0;
    const lastMatchProfileVersion = versionData?.lastMatchProfileVersion || 0;
    const lastMatchDocsVersion = versionData?.lastMatchDocsVersion || 0;
    
    // Check if profile version changed
    if (profileVersion !== lastMatchProfileVersion) {
      return {
        shouldRun: true,
        reason: 'DOCS_UPLOAD',
        currentProfileVersion: profileVersion,
        currentDocsVersion: docsVersion,
      };
    }
    
    // Check if docs version changed
    if (docsVersion !== lastMatchDocsVersion) {
      return {
        shouldRun: true,
        reason: 'DOCS_UPLOAD',
        currentProfileVersion: profileVersion,
        currentDocsVersion: docsVersion,
      };
    }
    
    // No need to run
    return {
      shouldRun: false,
      reason: null,
      currentProfileVersion: profileVersion,
      currentDocsVersion: docsVersion,
    };
  } catch (error: any) {
    console.error('[shouldRunMatching] Error:', error);
    // On error, default to running (safe fallback)
    return { shouldRun: true, reason: 'FIRST_DASHBOARD' };
  }
}

/**
 * Save match run to Firestore
 * Includes eligible matches, unknown eligibility matches, and run statistics
 */
export async function saveMatchRun(
  userId: string,
  runId: string,
  trigger: MatchTrigger,
  profileVersion: number,
  docsVersion: number,
  topMatches: TopMatch[], // Eligible matches only
  status: 'complete' | 'running' | 'error' = 'complete',
  error?: string,
  unknownMatches?: TopMatch[], // Unknown eligibility bucket
  runStats?: {
    totalConsidered: number;
    eligibleCount: number;
    unknownCount: number;
    ineligibleCount: number;
    missingFieldCounts: {
      applicantTypes: number;
      eligibleEntities: number;
      closeDate: number;
      description: number;
    };
    topBlockers: Array<{ blocker: string; count: number }>;
  }
): Promise<void> {
  const db = getAdminFirestore();
  
  // Combine all matches for full run record (eligible + unknown + ineligible for audit)
  const allMatches = [
    ...topMatches,
    ...(unknownMatches || []),
  ];
  
  // Build run object, only including error if it exists
  const run: any = {
    runId,
    createdAt: new Date().toISOString(),
    trigger,
    profileVersionUsed: profileVersion,
    docsVersionUsed: docsVersion,
    algorithmVersion: '2.0.0',
    topMatches: allMatches, // All matches for audit
    status,
    runStats, // Include run statistics
  };
  
  // Only include error field if it's actually set
  if (error !== undefined && error !== null && error !== '') {
    run.error = error;
  }
  
  // Save to runs collection
  await db
    .collection('userMatches')
    .doc(userId)
    .collection('runs')
    .doc(runId)
    .set(run);
  
  // Update current matches (eligible only in topMatches, unknown in separate bucket)
  const currentMatches: CurrentMatches = {
    runId,
    updatedAt: new Date().toISOString(),
    topMatches: topMatches.slice(0, 50), // ONLY eligible matches
    unknownEligibilityMatches: (unknownMatches || []).slice(0, 50), // Unknown eligibility bucket
    counts: {
      total: topMatches.length + (unknownMatches?.length || 0),
      eligible: topMatches.length,
      unknown: unknownMatches?.length || 0,
      ineligible: runStats?.ineligibleCount || 0,
      highScore: topMatches.filter(m => m.scores.rankingScore >= 35).length,
    },
    runStats, // Include run statistics
  };
  
  await db
    .collection('userMatches')
    .doc(userId)
    .collection('current')
    .doc('latest')
    .set(currentMatches);
  
  // Update both users and profiles collections with last match run info
  const updateData = {
    lastMatchRun: new Date().toISOString(),
    lastMatchProfileVersion: profileVersion,
    lastMatchDocsVersion: docsVersion,
  };
  
  await db.collection('users').doc(userId).set(updateData, { merge: true });
  await db.collection('profiles').doc(userId).set(updateData, { merge: true });
  
  // Also save the current matches to profiles collection for easy access
  // Use merge: true to preserve other profile fields
  const profileUpdate = {
    currentMatches: currentMatches,
    lastMatchRun: updateData.lastMatchRun,
    lastMatchProfileVersion: updateData.lastMatchProfileVersion,
    lastMatchDocsVersion: updateData.lastMatchDocsVersion,
  };
  await db.collection('profiles').doc(userId).set(profileUpdate, { merge: true });
  
  // Ensure the data is properly saved by also updating userMatches (primary location)
  // This ensures both locations have the data for redundancy
  console.log(`[saveMatchRun] Saved match run ${runId} for user ${userId}`);
  console.log(`[saveMatchRun] Saved currentMatches with ${topMatches.length} eligible, ${unknownMatches?.length || 0} unknown matches`);
}

/**
 * Get current matches for a user
 */
export async function getCurrentMatches(userId: string): Promise<CurrentMatches | null> {
  const db = getAdminFirestore();
  
  try {
    const currentMatchesRef = db
      .collection('userMatches')
      .doc(userId)
      .collection('current')
      .doc('latest');
    
    const doc = await currentMatchesRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as CurrentMatches;
  } catch (error: any) {
    console.error('[getCurrentMatches] Error:', error);
    return null;
  }
}

/**
 * Save user opportunity signal (pass/save/apply)
 */
export async function saveUserOpportunitySignal(
  userId: string,
  opportunityId: string,
  status: 'passed' | 'saved' | 'applied',
  runIdContext?: string,
  userNotes?: string
): Promise<void> {
  const db = getAdminFirestore();
  
  const now = new Date().toISOString();
  const timestamps: any = {};
  
  if (status === 'passed') {
    timestamps.passedAt = now;
  } else if (status === 'saved') {
    timestamps.savedAt = now;
  } else if (status === 'applied') {
    timestamps.appliedAt = now;
  }
  
  // Get existing signal if any
  const signalRef = db
    .collection('userOpportunitySignals')
    .doc(userId)
    .collection('signals')
    .doc(opportunityId);
  
  const existingDoc = await signalRef.get();
  const existingData = existingDoc.exists ? existingDoc.data() : undefined;
  
  // Build signal object, only including fields that have values
  const signal: any = {
    opportunityId,
    status,
    timestamps: {
      ...(existingData?.timestamps || {}),
      ...timestamps,
    },
    lastActionAt: now,
  };
  
  // Only include runIdContext if it has a value
  const finalRunIdContext = runIdContext || existingData?.runIdContext;
  if (finalRunIdContext) {
    signal.runIdContext = finalRunIdContext;
  }
  
  // Only include userNotes if it has a value
  const finalUserNotes = userNotes || existingData?.userNotes;
  if (finalUserNotes) {
    signal.userNotes = finalUserNotes;
  }
  
  await signalRef.set(signal);
  
  console.log(`[saveUserOpportunitySignal] Saved ${status} signal for opportunity ${opportunityId}`);
}

/**
 * Get user opportunity signals
 */
export async function getUserOpportunitySignals(userId: string): Promise<Map<string, UserOpportunitySignal>> {
  const db = getAdminFirestore();
  const signals = new Map<string, UserOpportunitySignal>();
  
  try {
    const signalsRef = db
      .collection('userOpportunitySignals')
      .doc(userId)
      .collection('signals');
    
    const snapshot = await signalsRef.get();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as UserOpportunitySignal;
      signals.set(data.opportunityId, data);
    });
    
    return signals;
  } catch (error: any) {
    console.error('[getUserOpportunitySignals] Error:', error);
    return signals;
  }
}

/**
 * Get user profile with version info
 * Reads from profiles collection (current data location) and syncs to users collection
 */
export async function getUserProfileWithVersions(userId: string): Promise<{
  profile: UserProfile | null;
  profileVersion: number;
  docsVersion: number;
}> {
  const db = getAdminFirestore();
  
  try {
    // Read from profiles collection (where data currently lives)
    const profileRef = db.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    
    if (profileDoc.exists) {
      const profileData = profileDoc.data() as any;
      
      // Convert Firestore timestamps to Date objects
      const profile: UserProfile = {
        ...profileData,
        createdAt: profileData.createdAt?.toDate?.() || profileData.createdAt || new Date(),
        updatedAt: profileData.updatedAt?.toDate?.() || profileData.updatedAt || new Date(),
      };
      
      const profileVersion = profileData?.profileVersion || 1;
      const docsVersion = profileData?.docsVersion || 0;
      
      // Sync version info to users collection for new matching system
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        profileVersion,
        docsVersion,
        lastMatchProfileVersion: profileData?.lastMatchProfileVersion || 0,
        lastMatchDocsVersion: profileData?.lastMatchDocsVersion || 0,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      return {
        profile,
        profileVersion,
        docsVersion,
      };
    }
    
    // Try users collection as fallback
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        profile: userData as UserProfile,
        profileVersion: userData?.profileVersion || 1,
        docsVersion: userData?.docsVersion || 0,
      };
    }
    
    return { profile: null, profileVersion: 1, docsVersion: 0 };
  } catch (error: any) {
    console.error('[getUserProfileWithVersions] Error:', error);
    return { profile: null, profileVersion: 1, docsVersion: 0 };
  }
}

/**
 * Increment profile version (call when profile changes)
 */
export async function incrementProfileVersion(userId: string): Promise<number> {
  const db = getAdminFirestore();
  
  try {
    // Read from profiles collection (primary)
    const profileRef = db.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    
    const currentVersion = profileDoc.exists 
      ? (profileDoc.data()?.profileVersion || 1) 
      : 1;
    const newVersion = currentVersion + 1;
    
    // Update both collections
    await profileRef.set({
      profileVersion: newVersion,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    await db.collection('users').doc(userId).set({
      profileVersion: newVersion,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return newVersion;
  } catch (error: any) {
    console.error('[incrementProfileVersion] Error:', error);
    return 1;
  }
}

/**
 * Increment docs version (call when documents are uploaded/updated)
 */
export async function incrementDocsVersion(userId: string): Promise<number> {
  const db = getAdminFirestore();
  
  try {
    // Read from profiles collection (primary)
    const profileRef = db.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    
    const currentVersion = profileDoc.exists 
      ? (profileDoc.data()?.docsVersion || 0) 
      : 0;
    const newVersion = currentVersion + 1;
    
    // Update both collections
    await profileRef.set({
      docsVersion: newVersion,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    await db.collection('users').doc(userId).set({
      docsVersion: newVersion,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return newVersion;
  } catch (error: any) {
    console.error('[incrementDocsVersion] Error:', error);
    return 0;
  }
}

/**
 * Migrate existing user to new data model (lazy migration)
 * Ensures both users and profiles collections have version info
 */
export async function migrateUserIfNeeded(userId: string): Promise<void> {
  const db = getAdminFirestore();
  
  try {
    // Check profiles collection (primary)
    const profileRef = db.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    const defaultVersions = {
      profileVersion: 1,
      docsVersion: 0,
      lastMatchProfileVersion: 0,
      lastMatchDocsVersion: 0,
    };
    
    // Migrate profiles collection if needed
    if (profileDoc.exists) {
      const profileData = profileDoc.data();
      if (profileData?.profileVersion === undefined) {
        await profileRef.set(defaultVersions, { merge: true });
        console.log(`[migrateUserIfNeeded] Migrated profiles collection for ${userId}`);
      }
    } else {
      // Profile doesn't exist - create with defaults
      await profileRef.set({
        ...defaultVersions,
        createdAt: new Date().toISOString(),
      });
      console.log(`[migrateUserIfNeeded] Created profiles document for ${userId}`);
    }
    
    // Migrate users collection if needed
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.profileVersion === undefined) {
        await userRef.set(defaultVersions, { merge: true });
        console.log(`[migrateUserIfNeeded] Migrated users collection for ${userId}`);
      }
    } else {
      // User doesn't exist - create with defaults
      await userRef.set({
        ...defaultVersions,
        createdAt: new Date().toISOString(),
      });
      console.log(`[migrateUserIfNeeded] Created users document for ${userId}`);
    }
  } catch (error: any) {
    console.error('[migrateUserIfNeeded] Error:', error);
  }
}

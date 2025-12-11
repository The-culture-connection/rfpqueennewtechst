'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOpportunities } from '@/hooks/useOpportunities';
import OpportunityCard from '@/components/OpportunityCard';
import { doc, setDoc, arrayUnion, getDoc, writeBatch } from 'firebase/firestore';
import { db, getFirebaseFunctions, httpsCallable } from '@/lib/firebase';
import {
  trackDashboardViewed,
  trackOpportunityViewed,
  trackOpportunityPassed,
  trackOpportunitySaved,
  trackOpportunityApplied,
  trackDashboardStartOver,
} from '@/lib/analytics';
import { trackUserAction } from '@/lib/preferenceLearning';
import { FeedbackForm } from '@/components/FeedbackForm';
import { LoadingMeter } from '@/components/LoadingMeter';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [forceReload, setForceReload] = useState(false);
  const { opportunities, loading, error, refetch } = useOpportunities(userProfile, forceReload);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [hasExecutiveSummary, setHasExecutiveSummary] = useState(false);

  // Redirect if not authenticated or profile incomplete
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (!user) {
      console.log('❌ No user, redirecting to login');
      router.push('/login');
      return;
    }
    
    // Check if user has accepted terms first
    if (userProfile) {
      if (!userProfile.termsAccepted) {
        console.log('⚠️ Terms not accepted, redirecting to terms page');
        router.push('/terms');
        return;
      }
      
      // Check if user has completed onboarding
      if (!userProfile.entityName || !userProfile.fundingType || userProfile.fundingType.length === 0) {
        console.log('⚠️ Incomplete profile detected:', userProfile);
        console.log('⚠️ Missing - entityName:', !userProfile.entityName, 'fundingType:', !userProfile.fundingType || userProfile.fundingType.length === 0);
        router.push('/onboarding');
        return;
      }
      console.log('✅ User authenticated with complete profile:', userProfile);
    } else {
      console.log('⏳ Waiting for user profile to load...');
    }
  }, [user, userProfile, loading, router]);

  // Track dashboard view when opportunities are loaded
  useEffect(() => {
    if (!loading && opportunities.length > 0) {
      trackDashboardViewed(opportunities.length);
    }
  }, [loading, opportunities.length]);

  // Check if executive summary is processed (completed)
  useEffect(() => {
    async function checkExecutiveSummary() {
      if (!user || !db) return;
      
      try {
        const docsRef = collection(db, 'profiles', user.uid, 'documents');
        const q = query(docsRef, where('documentType', '==', 'executive-summary'));
        const querySnapshot = await getDocs(q);
        
        // Check if any executive summary document has processingStatus === 'completed'
        const hasCompleted = querySnapshot.docs.some(doc => {
          const data = doc.data();
          return data.processingStatus === 'completed';
        });
        
        setHasExecutiveSummary(hasCompleted);
      } catch (error) {
        console.error('Error checking executive summary:', error);
      }
    }
    
    if (user) {
      checkExecutiveSummary();
      // Re-check periodically to update when processing completes
      const interval = setInterval(checkExecutiveSummary, 5000);
      return () => clearInterval(interval);
    }
  }, [user, db]);

  // Note: Removed auto-refresh to prevent crashes. Users can manually refresh if needed.

  // Load saved progress when opportunities are ready
  useEffect(() => {
    async function loadProgress() {
      if (!user || !opportunities.length || progressLoaded || !db) return;

      try {
        const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
        const progressDoc = await getDoc(progressRef);

        if (progressDoc.exists()) {
          const data = progressDoc.data();
          const savedPassedIds = data.passedIds || [];
          const savedCurrentId = data.currentOpportunityId;

          // Restore passed IDs
          setPassedIds(savedPassedIds);

          // Find the index of the saved opportunity
          if (savedCurrentId) {
            const savedIndex = opportunities.findIndex(opp => opp.id === savedCurrentId);
            if (savedIndex !== -1) {
              setCurrentIndex(savedIndex);
              console.log(`✅ Resumed from opportunity ${savedIndex + 1}`);
            }
          }
        }

        setProgressLoaded(true);
      } catch (err) {
        console.error('Error loading progress:', err);
        setProgressLoaded(true);
      }
    }

    loadProgress();
  }, [user, opportunities, progressLoaded]);

  // Save progress whenever position changes (but only after progress is loaded)
  useEffect(() => {
    async function saveProgress() {
      // Don't save until progress has been loaded from Firestore
      if (!user || !progressLoaded || !opportunities.length) return;

      // Recalculate available opportunities
      const available = opportunities.filter(opp => !passedIds.includes(opp.id));
      const currentOpportunity = available[currentIndex];
      if (!currentOpportunity) return;

      // Track opportunity view
      trackOpportunityViewed(
        currentOpportunity.id,
        currentOpportunity.winRate || 0,
        currentOpportunity.type,
        !!(currentOpportunity.closeDate || currentOpportunity.deadline)
      );

      if (!db) return;

      try {
        const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
        await setDoc(progressRef, {
          currentOpportunityId: currentOpportunity.id,
          passedIds: passedIds,
          lastUpdated: new Date().toISOString(),
        });
        console.log(`💾 Progress saved: Opportunity ${currentIndex + 1}`);
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    }

    // Only save if progressLoaded is true (prevents overwriting on initial load)
    if (progressLoaded) {
      saveProgress();
    }
  }, [currentIndex, passedIds, user, progressLoaded, opportunities]);

  // Load saved opportunities IDs to exclude them too
  useEffect(() => {
    async function loadSavedIds() {
      if (!user || !db) return;
      
      try {
        const trackerRef = doc(db, 'profiles', user.uid, 'tracker', 'saved');
        const trackerDoc = await getDoc(trackerRef);
        
        if (trackerDoc.exists()) {
          const data = trackerDoc.data();
          const savedOpportunities = data.opportunities || [];
          const savedIdsList = savedOpportunities.map((opp: any) => opp.id).filter(Boolean);
          setSavedIds(savedIdsList);
          console.log(`✅ Loaded ${savedIdsList.length} saved opportunity IDs to exclude`);
        }
      } catch (err) {
        console.error('Error loading saved IDs:', err);
      }
    }
    
    loadSavedIds();
  }, [user, db]);

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          <LoadingMeter loading={true} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="font-secondary text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Filter out passed AND saved opportunities
  const allExcludedIds = new Set([...passedIds, ...savedIds]);
  const availableOpportunities = opportunities.filter(opp => !allExcludedIds.has(opp.id));
  const currentOpportunity = availableOpportunities[currentIndex];

  // Reset progress and start over
  const handleStartOver = async () => {
    if (!user || !db) return;
    
    if (confirm('Are you sure you want to start over? This will reset your progress.')) {
      try {
        trackDashboardStartOver();
        setPassedIds([]);
        setCurrentIndex(0);
        
        // Clear progress from Firestore
        const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
        await setDoc(progressRef, {
          currentOpportunityId: opportunities[0]?.id || null,
          passedIds: [],
          lastUpdated: new Date().toISOString(),
        });
        
        console.log('✅ Progress reset');
      } catch (err) {
        console.error('Error resetting progress:', err);
      }
    }
  };

  const handleRerunMatching = async () => {
    if (!user) return;
    
    // Set loading state FIRST - this triggers LoadingMeter immediately
    // React will re-render synchronously, showing LoadingMeter before async operations start
    setRerunLoading(true);
    
    try {
      // PRESERVE USER PROGRESS before clearing cache
      const savedProgress = {
        passedIds: [...passedIds],
        currentIndex: currentIndex,
        currentOpportunityId: opportunities[currentIndex]?.id,
      };
      console.log('💾 Preserving progress before cache clear:', savedProgress);
      
      // Save progress to Firestore before clearing cache
      if (db && user) {
        const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
        await setDoc(progressRef, {
          currentOpportunityId: savedProgress.currentOpportunityId,
          passedIds: savedProgress.passedIds,
          lastUpdated: new Date().toISOString(),
        });
        console.log('✅ Progress saved to Firestore before cache clear');
      }
      
      // Clear Firestore cache before rerunning
      const { clearOpportunityCache } = await import('@/lib/opportunityCache');
      await clearOpportunityCache(user.uid);
      
      // Clear localStorage cache as well
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('cached_opportunities');
          localStorage.removeItem('cached_opportunities_timestamp');
          localStorage.removeItem('cached_opportunities_profile');
          console.log('Cleared opportunity cache');
        } catch (err) {
          console.warn('Error clearing localStorage cache:', err);
        }
      }

      const functions = getFirebaseFunctions();
      const matchOpportunities = httpsCallable<{ pageSize?: number }, { results: any[], meta: any }>(functions, 'matchOpportunities');
      
      const result = await matchOpportunities({ pageSize: 500 });
      console.log('Match opportunities result:', result.data);
      
      // Force reload opportunities after matching (clears cache)
      setForceReload(true);
      if (refetch) {
        refetch();
      }
      
      // Restore progress after opportunities reload
      // Reset progressLoaded so the useEffect will reload progress from Firestore
      setProgressLoaded(false);
      setPassedIds(savedProgress.passedIds);
      console.log('✅ Progress preserved - will be restored when opportunities load');
      
      // Reset force reload after a moment to allow the refetch to complete
      setTimeout(() => {
        setForceReload(false);
      }, 2000);
    } catch (err: any) {
      console.error('Error rerunning matching:', err);
      alert(`Error rerunning opportunity matching: ${err.message || 'Unknown error'}`);
    } finally {
      setRerunLoading(false);
    }
  };

  const handlePass = async (id: string) => {
    // Check if already passed - prevent duplicate passes
    if (passedIds.includes(id)) {
      console.warn('⚠️ [Pass] Opportunity already passed, skipping:', id);
      return;
    }
    
    const opportunity = opportunities.find(opp => opp.id === id);
    if (!opportunity) {
      console.error('❌ [Pass] Opportunity not found:', id);
      return;
    }
    
    trackOpportunityPassed(
      id,
      opportunity.winRate || 0,
      opportunity.type
    );
    
    // Track pass for preference learning
    if (user && opportunity && db) {
      await trackUserAction(user.uid, opportunity, 'pass', db);
      console.log('📊 Tracked pass for preference learning');
    }
    
    // Save passed opportunity to Firestore for AI refinement
    if (user && db && opportunity) {
      try {
        // Log authentication and path details
        const path = `profiles/${user.uid}/dashboard/passed`;
        console.log('🔍 [Passed Opportunity] Attempting to save:', {
          userId: user.uid,
          userEmail: user.email,
          path: path,
          opportunityId: id,
          isAuthenticated: !!user,
          authToken: user ? 'present' : 'missing',
          dbInitialized: !!db,
        });
        
        // Test: Try to read the profile document first to verify basic permissions
        const profileRef = doc(db, 'profiles', user.uid);
        console.log('🔍 [Passed Opportunity] Testing profile read permissions...');
        try {
          const profileDoc = await getDoc(profileRef);
          console.log('✅ [Passed Opportunity] Profile read successful:', {
            exists: profileDoc.exists(),
            canReadProfile: true,
          });
        } catch (profileErr: any) {
          console.error('❌ [Passed Opportunity] Profile read failed:', {
            error: profileErr?.message,
            code: profileErr?.code,
            suggestion: 'User may not have read access to their own profile',
          });
        }
        
        // Test: Try to read dashboard/progress to verify dashboard subcollection permissions
        const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
        console.log('🔍 [Passed Opportunity] Testing dashboard/progress read permissions...');
        try {
          const progressDoc = await getDoc(progressRef);
          console.log('✅ [Passed Opportunity] Dashboard/progress read successful:', {
            exists: progressDoc.exists(),
            canReadDashboard: true,
          });
        } catch (progressErr: any) {
          console.error('❌ [Passed Opportunity] Dashboard/progress read failed:', {
            error: progressErr?.message,
            code: progressErr?.code,
            suggestion: 'User may not have read access to dashboard subcollection',
          });
        }
        
        // Save to passed opportunities collection
        const passedRef = doc(db, 'profiles', user.uid, 'dashboard', 'passed');
        
        // Try to read first to check permissions
        console.log('🔍 [Passed Opportunity] Attempting to read existing document at:', passedRef.path);
        console.log('🔍 [Passed Opportunity] Full path breakdown:', {
          collection: 'profiles',
          document: user.uid,
          subcollection: 'dashboard',
          docId: 'passed',
          fullPath: passedRef.path,
        });
        
        let passedDoc;
        try {
          passedDoc = await getDoc(passedRef);
          console.log('✅ [Passed Opportunity] Read successful:', {
            exists: passedDoc.exists(),
            hasData: !!passedDoc.data(),
            path: passedRef.path,
          });
        } catch (readErr: any) {
          console.error('❌ [Passed Opportunity] Read failed:', {
            error: readErr?.message,
            code: readErr?.code,
            path: passedRef.path,
            suggestion: 'This indicates a Firestore rules issue. Check that rules are deployed.',
          });
          throw readErr; // Re-throw to be caught by outer catch
        }
        
        // Check if this opportunity ID is already in the passed document
        const existingData = passedDoc.exists() ? passedDoc.data() : {};
        if (existingData[id]) {
          console.warn('⚠️ [Passed Opportunity] Already passed in Firestore, skipping duplicate save:', id);
          // Still add to passedIds to filter it out
          if (!passedIds.includes(id)) {
            setPassedIds([...passedIds, id]);
          }
          return; // Don't save duplicate
        }
        
        const passedData = {
          [id]: {
            id: id,
            title: opportunity.title || '',
            agency: opportunity.agency || '',
            source: opportunity.source || '',
            passedAt: new Date().toISOString(),
            winRate: opportunity.winRate || 0
          }
        };
        
        console.log('🔍 [Passed Opportunity] Data to save:', {
          dataKeys: Object.keys(passedData),
          opportunityId: id,
          dataSize: JSON.stringify(passedData).length,
        });
        
        if (passedDoc.exists()) {
          // Merge with existing passed opportunities
          const existing = passedDoc.data();
          console.log('🔍 [Passed Opportunity] Merging with existing data, existing keys:', Object.keys(existing || {}));
          await setDoc(passedRef, {
            ...existing,
            ...passedData
          }, { merge: true });
          console.log('✅ [Passed Opportunity] Successfully merged passed opportunity');
        } else {
          // Create new document
          console.log('🔍 [Passed Opportunity] Creating new document...');
          await setDoc(passedRef, passedData);
          console.log('✅ [Passed Opportunity] Successfully created new document');
        }
      } catch (err: any) {
        // Comprehensive error logging
        console.error('❌ [Passed Opportunity] Error saving passed opportunity:', {
          error: err,
          errorMessage: err?.message,
          errorCode: err?.code,
          errorStack: err?.stack,
          errorName: err?.name,
          userId: user?.uid,
          userEmail: user?.email,
          path: `profiles/${user?.uid}/dashboard/passed`,
          opportunityId: id,
          isAuthenticated: !!user,
          dbInitialized: !!db,
          // Firebase-specific error details
          firebaseError: err?.code ? {
            code: err.code,
            message: err.message,
            serverResponse: err.serverResponse,
          } : null,
        });
        
        // Log specific permission error details
        if (err?.code === 'permission-denied' || err?.code === 'PERMISSION_DENIED') {
          console.error('🚫 [Passed Opportunity] Permission denied details:', {
            userId: user?.uid,
            expectedPath: `profiles/${user?.uid}/dashboard/passed`,
            rulePath: 'profiles/{userId}/dashboard/passed',
            authState: user ? {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
            } : 'no user',
            suggestion: 'Check Firestore rules for profiles/{userId}/dashboard/passed',
          });
        }
        
        // Don't block the UI if save fails
      }
    } else {
      console.warn('⚠️ [Passed Opportunity] Missing prerequisites:', {
        hasUser: !!user,
        hasDb: !!db,
        hasOpportunity: !!opportunity,
      });
    }
    
    setPassedIds([...passedIds, id]);
    // Move to next opportunity
    if (currentIndex < availableOpportunities.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const handleSave = async (id: string) => {
    if (!user || !db) return;
    
    // Check if already saved - prevent duplicate saves
    if (savedIds.includes(id)) {
      console.warn('⚠️ [Save] Opportunity already saved, skipping:', id);
      alert('This opportunity is already saved!');
      return;
    }
    
    setActionLoading(true);
    try {
      const opportunity = opportunities.find(opp => opp.id === id);
      if (!opportunity) return;

      const trackerRef = doc(db, 'profiles', user.uid, 'tracker', 'saved');
      const trackerDoc = await getDoc(trackerRef);

      const savedOpportunity = {
        ...opportunity,
        savedAt: new Date().toISOString(),
        status: 'saved'
      };

      if (trackerDoc.exists()) {
        const existing = trackerDoc.data().opportunities || [];
        // Check if already exists
        if (existing.some((opp: any) => opp.id === id)) {
          console.warn('⚠️ [Save] Opportunity already in tracker, skipping:', id);
          alert('This opportunity is already saved!');
          setActionLoading(false);
          return;
        }
        await setDoc(trackerRef, {
          opportunities: [...existing, savedOpportunity]
        }, { merge: true });
      } else {
        await setDoc(trackerRef, {
          opportunities: [savedOpportunity]
        });
      }
      
      // Add to savedIds to exclude from dashboard immediately
      setSavedIds([...savedIds, id]);

      // Track save event
      trackOpportunitySaved(
        id,
        opportunity.winRate || 0,
        opportunity.type,
        opportunity.amount
      );
      
      // Track save for preference learning
      await trackUserAction(user.uid, opportunity, 'save', db);

      // Show success and move to next
      alert('Opportunity saved!');
      if (currentIndex < availableOpportunities.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error('Error saving opportunity:', err);
      alert('Failed to save opportunity');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    if (!user) return;
    
    const opportunity = opportunities.find(opp => opp.id === id);
    if (!opportunity) return;

    // Open opportunity URL in new tab
    if (opportunity.url) {
      window.open(opportunity.url, '_blank', 'noopener,noreferrer');
    }
    
    if (!db) return;
    
    setActionLoading(true);
    try {
      const trackerRef = doc(db, 'profiles', user.uid, 'tracker', 'applied');
      const trackerDoc = await getDoc(trackerRef);

      if (trackerDoc.exists()) {
        await setDoc(trackerRef, {
          opportunities: arrayUnion({
            ...opportunity,
            appliedAt: new Date().toISOString(),
            status: 'applied'
          })
        }, { merge: true });
      } else {
        await setDoc(trackerRef, {
          opportunities: [{
            ...opportunity,
            appliedAt: new Date().toISOString(),
            status: 'applied'
          }]
        });
      }

      // Track apply event
      trackOpportunityApplied(
        id,
        opportunity.winRate || 0,
        opportunity.type,
        opportunity.amount
      );
      
      // Track apply for preference learning
      await trackUserAction(user.uid, opportunity, 'apply', db);

      // Show success and move to next
      alert('Added to Applied tracker! Opening opportunity...');
      if (currentIndex < availableOpportunities.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error('Error marking as applied:', err);
      alert('Failed to mark as applied');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-surface/50 backdrop-blur-sm border-b border-primary/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary gradient-text">RFP Matcher</h1>
              <p className="text-sm font-secondary text-foreground/70 mt-1">
                Welcome back, {userProfile.entityName}!
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/tracker')}
                className="btn-secondary text-sm"
              >
                My Tracker
              </button>
              <button
                onClick={() => router.push('/documents')}
                className="btn-secondary text-sm"
                title="Upload and manage your documents"
              >
                Documents
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="btn-secondary text-sm"
                title="Edit your profile and preferences"
              >
                Edit Profile
              </button>
              <button
                onClick={handleRerunMatching}
                disabled={rerunLoading || loading}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rerun opportunity matching with updated profile"
              >
                {rerunLoading ? 'Rerunning...' : 'Rerun Matching'}
              </button>
              <button
                onClick={handleStartOver}
                className="btn-secondary text-sm"
                title="Reset progress and start from beginning"
              >
                Start Over
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <LoadingMeter loading={loading || rerunLoading} />
        {/* Resume indicator */}
        {currentIndex > 0 && progressLoaded && (
          <div className="card mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-secondary text-foreground/80">
              Resumed from where you left off (Opportunity {currentIndex + 1})
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm font-secondary text-foreground/70">Total Matches</p>
            <p className="text-2xl font-primary gradient-text">{opportunities.length}</p>
          </div>
          <div className="card">
            <p className="text-sm font-secondary text-foreground/70">Remaining</p>
            <p className="text-2xl font-primary gradient-text">{availableOpportunities.length}</p>
          </div>
          <div className="card">
            <p className="text-sm font-secondary text-foreground/70">Passed</p>
            <p className="text-2xl font-primary gradient-text">{passedIds.length}</p>
          </div>
        </div>

        {/* Opportunity Card */}
        {currentOpportunity ? (
          <div className="relative">
            {actionLoading && (
              <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <OpportunityCard
              userProfile={userProfile}
              opportunity={currentOpportunity}
              onPass={handlePass}
              onSave={handleSave}
              onApply={handleApply}
            />
            
            {/* Navigation hint */}
            <div className="text-center mt-4">
              <p className="text-sm font-secondary text-foreground/70">
                Showing {currentIndex + 1} of {availableOpportunities.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <h2 className="text-2xl font-primary mb-2 gradient-text">
              You've reviewed all opportunities!
            </h2>
            <p className="font-secondary text-foreground/70 mb-6">
              Check your tracker to see saved and applied opportunities.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/tracker')}
                className="btn-primary"
              >
                View Tracker
              </button>
              <button
                onClick={() => {
                  setPassedIds([]);
                  setCurrentIndex(0);
                }}
                className="btn-secondary"
              >
                Review Again
              </button>
            </div>
          </div>
        )}
          </div>

          {/* Sidebar with To-Do and Feedback */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* To-Do Section */}
              <div className="card">
                <h2 className="text-lg font-primary gradient-text mb-4">To-Do</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/documents')}
                    className={`w-full text-left p-3 bg-surface/50 border rounded-lg hover:border-primary/50 hover:bg-surface/70 transition-all group ${
                      hasExecutiveSummary 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
                        hasExecutiveSummary
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-primary/50 group-hover:border-primary'
                      }`}>
                        {hasExecutiveSummary ? (
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-secondary font-medium ${
                          hasExecutiveSummary ? 'text-green-400' : 'text-foreground'
                        }`}>
                          Upload Executive Summary
                        </p>
                        <p className="text-xs font-secondary text-foreground/60 mt-1">
                          {hasExecutiveSummary 
                            ? 'Executive summary uploaded ✓' 
                            : 'Enhance matching with your business profile'}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
              
              <FeedbackForm
                questions={[
                  'Do the opportunities shown to you apply to you?',
                  'Is there any information about the opportunities you wish was included?'
                ]}
                page="dashboard"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


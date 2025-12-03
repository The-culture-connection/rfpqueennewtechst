'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOpportunities } from '@/hooks/useOpportunities';
import OpportunityCard from '@/components/OpportunityCard';
import { doc, setDoc, arrayUnion, getDoc } from 'firebase/firestore';
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
import KeywordManager from '@/components/KeywordManager';

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [forceReload, setForceReload] = useState(false);
  const { opportunities, loading, error, refetch } = useOpportunities(userProfile, forceReload);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);

  // Redirect if not authenticated or profile incomplete
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (!user) {
      console.log('❌ No user, redirecting to login');
      router.push('/login');
      return;
    }
    
    // Check if user has completed onboarding
    // Only redirect if we have a userProfile object that's incomplete
    // If userProfile is null, we're still loading it
    if (userProfile) {
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

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-[#1d1d1e] flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          <LoadingMeter loading={true} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1d1d1e] flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="font-secondary text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter out passed opportunities
  const availableOpportunities = opportunities.filter(opp => !passedIds.includes(opp.id));
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
      // Clear cache before rerunning
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('cached_opportunities');
          localStorage.removeItem('cached_opportunities_timestamp');
          localStorage.removeItem('cached_opportunities_profile');
          console.log('Cleared opportunity cache');
        } catch (err) {
          console.warn('Error clearing cache:', err);
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
      // Reset force reload after a moment
      setTimeout(() => setForceReload(false), 1000);
    } catch (err: any) {
      console.error('Error rerunning matching:', err);
      alert(`Error rerunning opportunity matching: ${err.message || 'Unknown error'}`);
    } finally {
      setRerunLoading(false);
    }
  };

  const handlePass = async (id: string) => {
    const opportunity = opportunities.find(opp => opp.id === id);
    if (opportunity) {
      trackOpportunityPassed(
        id,
        opportunity.winRate || 0,
        opportunity.type
      );
    }
    
    // Track pass for preference learning
    if (user && opportunity && db) {
      await trackUserAction(user.uid, opportunity, 'pass', db);
      console.log('📊 Tracked pass for preference learning');
    }
    
    // Save passed opportunity to Firestore for AI refinement
    if (user && db && opportunity) {
      try {
        // Save to passed opportunities collection
        const passedRef = doc(db, 'profiles', user.uid, 'dashboard', 'passed');
        const passedDoc = await getDoc(passedRef);
        
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
        
        if (passedDoc.exists()) {
          // Merge with existing passed opportunities
          const existing = passedDoc.data();
          await setDoc(passedRef, {
            ...existing,
            ...passedData
          }, { merge: true });
        } else {
          // Create new document
          await setDoc(passedRef, passedData);
        }
      } catch (err) {
        console.error('Error saving passed opportunity:', err);
        // Don't block the UI if save fails
      }
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
    
    setActionLoading(true);
    try {
      const opportunity = opportunities.find(opp => opp.id === id);
      if (!opportunity) return;

      const trackerRef = doc(db, 'profiles', user.uid, 'tracker', 'saved');
      const trackerDoc = await getDoc(trackerRef);

      if (trackerDoc.exists()) {
        await setDoc(trackerRef, {
          opportunities: arrayUnion({
            ...opportunity,
            savedAt: new Date().toISOString(),
            status: 'saved'
          })
        }, { merge: true });
      } else {
        await setDoc(trackerRef, {
          opportunities: [{
            ...opportunity,
            savedAt: new Date().toISOString(),
            status: 'saved'
          }]
        });
      }

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
    <div className="min-h-screen bg-[#1d1d1e]">
      {/* Header */}
      <div className="bg-[#1d1d1e] border-b border-[#ad3c94]/30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary text-[#ad3c94]">RFP Matcher</h1>
              <p className="text-sm font-secondary text-[#e7e8ef] mt-1">
                Welcome back, {userProfile.entityName}!
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/tracker')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
              >
                My Tracker
              </button>
              <button
                onClick={() => router.push('/documents')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                title="Upload and manage your documents"
              >
                Documents
              </button>
              <button
                onClick={() => router.push('/executive-summary')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                title="Upload your executive summary for better matching"
              >
                Executive Summary
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                title="Edit your profile and preferences"
              >
                Edit Profile
              </button>
              <button
                onClick={handleRerunMatching}
                disabled={rerunLoading || loading}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rerun opportunity matching with updated profile"
              >
                {rerunLoading ? 'Rerunning...' : 'Rerun Matching'}
              </button>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                title="Reset progress and start from beginning"
              >
                Start Over
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-[#1d1d1e] text-[#e7e8ef] rounded-lg hover:bg-[#1d1d1e]/80 transition-all border border-[#ad3c94]/30 font-secondary"
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
              <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#ad3c94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
                <p className="text-sm font-secondary text-[#e7e8ef]">
              Resumed from where you left off (Opportunity {currentIndex + 1})
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4">
                <p className="text-sm font-secondary text-[#e7e8ef]/80">Total Matches</p>
                <p className="text-2xl font-primary text-[#ad3c94]">{opportunities.length}</p>
          </div>
              <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4">
                <p className="text-sm font-secondary text-[#e7e8ef]/80">Remaining</p>
                <p className="text-2xl font-primary text-[#ad3c94]">{availableOpportunities.length}</p>
          </div>
              <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4">
                <p className="text-sm font-secondary text-[#e7e8ef]/80">Passed</p>
                <p className="text-2xl font-primary text-[#ad3c94]">{passedIds.length}</p>
          </div>
        </div>

        {/* Opportunity Card */}
        {currentOpportunity ? (
          <div className="relative">
            {actionLoading && (
              <div className="absolute inset-0 bg-[#1d1d1e]/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ad3c94]"></div>
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
              <p className="text-sm font-secondary text-[#e7e8ef]/80">
                Showing {currentIndex + 1} of {availableOpportunities.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-primary text-[#ad3c94] mb-2">
              You've reviewed all opportunities!
            </h2>
            <p className="font-secondary text-[#e7e8ef]/80 mb-6">
              Check your tracker to see saved and applied opportunities.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/tracker')}
                className="px-6 py-3 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
              >
                View Tracker
              </button>
              <button
                onClick={() => {
                  setPassedIds([]);
                  setCurrentIndex(0);
                }}
                className="px-6 py-3 bg-[#1d1d1e] text-[#e7e8ef] rounded-lg hover:bg-[#1d1d1e]/80 transition-all border border-[#ad3c94]/30 font-secondary"
              >
                Review Again
              </button>
            </div>
          </div>
        )}
          </div>

          {/* Sidebar with Feedback */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <KeywordManager 
                user={user} 
                userProfile={userProfile}
                onUpdate={() => {
                  // Trigger a refetch when keywords are updated
                  if (refetch) refetch();
                }}
              />
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


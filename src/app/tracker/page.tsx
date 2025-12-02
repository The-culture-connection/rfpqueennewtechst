'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Opportunity } from '@/types';
import { trackTrackerViewed, trackTrackerTabSwitched } from '@/lib/analytics';

interface TrackedOpportunity extends Opportunity {
  savedAt?: string;
  appliedAt?: string;
  status: 'saved' | 'applied';
}

export default function TrackerPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [savedOpps, setSavedOpps] = useState<TrackedOpportunity[]>([]);
  const [appliedOpps, setAppliedOpps] = useState<TrackedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'applied'>('saved');

  const handleTabSwitch = (tab: 'saved' | 'applied') => {
    setActiveTab(tab);
    trackTrackerTabSwitched(tab);
  };

  // Calculate displayed opportunities based on active tab
  const displayedOpps = activeTab === 'saved' ? savedOpps : appliedOpps;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadTrackedOpportunities();
  }, [user, router]);

  // Track tracker view when data is loaded
  useEffect(() => {
    if (!loading && user) {
      trackTrackerViewed(activeTab, displayedOpps.length);
    }
  }, [loading, activeTab, displayedOpps.length, user]);

  const loadTrackedOpportunities = async () => {
    if (!user || !db) return;

    setLoading(true);
    try {
      // Load saved opportunities
      const savedRef = doc(db, 'profiles', user.uid, 'tracker', 'saved');
      const savedDoc = await getDoc(savedRef);
      if (savedDoc.exists()) {
        const data = savedDoc.data();
        setSavedOpps(data.opportunities || []);
      }

      // Load applied opportunities
      const appliedRef = doc(db, 'profiles', user.uid, 'tracker', 'applied');
      const appliedDoc = await getDoc(appliedRef);
      if (appliedDoc.exists()) {
        const data = appliedDoc.data();
        setAppliedOpps(data.opportunities || []);
      }
    } catch (err) {
      console.error('Error loading tracked opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1d1d1e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ad3c94] mx-auto mb-4"></div>
          <p className="font-secondary text-[#e7e8ef]">Loading tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1d1e]">
      {/* Header */}
      <div className="bg-[#1d1d1e] border-b border-[#ad3c94]/30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary text-[#ad3c94]">Opportunity Tracker</h1>
              <p className="text-sm font-secondary text-[#e7e8ef]/80 mt-1">
                {userProfile?.entityName || 'Your'} saved and applied opportunities
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4">
            <p className="text-sm font-secondary text-[#e7e8ef]/80">Saved</p>
            <p className="text-3xl font-primary text-[#ad3c94]">{savedOpps.length}</p>
          </div>
          <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg p-4">
            <p className="text-sm font-secondary text-[#e7e8ef]/80">Applied</p>
            <p className="text-3xl font-primary text-[#ad3c94]">{appliedOpps.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg mb-6">
          <div className="border-b border-[#ad3c94]/30">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabSwitch('saved')}
                className={`px-6 py-3 text-sm font-secondary border-b-2 transition-colors ${
                  activeTab === 'saved'
                    ? 'border-[#ad3c94] text-[#ad3c94]'
                    : 'border-transparent text-[#e7e8ef]/60 hover:text-[#e7e8ef] hover:border-[#ad3c94]/50'
                }`}
              >
                Saved ({savedOpps.length})
              </button>
              <button
                onClick={() => handleTabSwitch('applied')}
                className={`px-6 py-3 text-sm font-secondary border-b-2 transition-colors ${
                  activeTab === 'applied'
                    ? 'border-[#ad3c94] text-[#ad3c94]'
                    : 'border-transparent text-[#e7e8ef]/60 hover:text-[#e7e8ef] hover:border-[#ad3c94]/50'
                }`}
              >
                Applied ({appliedOpps.length})
              </button>
            </nav>
          </div>

          {/* Opportunity List */}
          <div className="p-6">
            {displayedOpps.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-primary text-[#ad3c94] mb-2">
                  No {activeTab} opportunities yet
                </h3>
                <p className="font-secondary text-[#e7e8ef]/80 mb-6">
                  {activeTab === 'saved'
                    ? 'Start saving opportunities from your dashboard'
                    : 'Mark opportunities as applied from your dashboard'}
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOpps.map((opp, index) => (
                  <div
                    key={`${opp.id}-${index}`}
                    className="border border-[#ad3c94]/30 rounded-lg p-6 hover:border-[#ad3c94]/50 hover:shadow-lg hover:shadow-[#ad3c94]/20 transition-all bg-[#1d1d1e]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {opp.winRate && (
                            <span className={`px-3 py-1 rounded-full text-sm font-primary border ${
                              opp.winRate >= 70
                                ? 'bg-[#1d1d1e] text-[#ad3c94] border-[#ad3c94]/50'
                                : opp.winRate >= 50
                                ? 'bg-[#1d1d1e] text-yellow-400 border-yellow-400/50'
                                : 'bg-[#1d1d1e] text-[#e7e8ef]/60 border-[#e7e8ef]/30'
                            }`}>
                              {opp.winRate}% Match
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-secondary border ${
                            opp.type === 'Grant'
                              ? 'bg-[#1d1d1e] text-[#ad3c94] border-[#ad3c94]/50'
                              : 'bg-[#1d1d1e] text-[#ad3c94] border-[#ad3c94]/50'
                          }`}>
                            {opp.type}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-secondary border ${
                            activeTab === 'saved'
                              ? 'bg-[#1d1d1e] text-yellow-400 border-yellow-400/50'
                              : 'bg-[#1d1d1e] text-green-400 border-green-400/50'
                          }`}>
                            {activeTab === 'saved' ? 'Saved' : 'Applied'}
                          </span>
                        </div>
                        <h3 className="text-lg font-primary text-[#ad3c94] mb-1">
                          {opp.title}
                        </h3>
                        <p className="text-sm font-secondary text-[#e7e8ef]/80 mb-2">
                          {opp.agency || 'Unknown Agency'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {opp.amount && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-[#e7e8ef]">{opp.amount}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm font-secondary">
                        <span className="text-[#e7e8ef]">
                          Deadline: {formatDate(opp.closeDate || opp.deadline)}
                        </span>
                      </div>
                      {(opp.savedAt || opp.appliedAt) && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-[#e7e8ef]/60">
                            {activeTab === 'saved' ? 'Saved' : 'Applied'} on:{' '}
                            {formatDate(opp.savedAt || opp.appliedAt)}
                          </span>
                        </div>
                      )}
                      {(opp.city || opp.state) && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-[#e7e8ef]">
                            {[opp.city, opp.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {opp.description && (
                      <p className="text-sm font-secondary text-[#e7e8ef]/80 mb-4 line-clamp-2">
                        {opp.description}
                      </p>
                    )}

                    {opp.url && (
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#ad3c94] hover:text-[#ad3c94]/80 font-secondary flex items-center gap-1"
                      >
                        View Full Opportunity
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


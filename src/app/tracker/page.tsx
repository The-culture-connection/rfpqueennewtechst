'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Opportunity } from '@/types';
import { trackTrackerViewed, trackTrackerTabSwitched } from '@/lib/analytics';
import { formatAmount } from '@/lib/formatAmount';

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
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-secondary text-foreground">Loading tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-surface/50 backdrop-blur-sm border-b border-primary/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-primary gradient-text">Opportunity Tracker</h1>
              <p className="text-sm font-secondary text-foreground/70 mt-1">
                {userProfile?.entityName || 'Your'} saved and applied opportunities
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-secondary text-sm"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="btn-secondary text-sm"
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
          <div className="card">
            <p className="text-sm font-secondary text-foreground/70">Saved</p>
            <p className="text-3xl font-primary gradient-text">{savedOpps.length}</p>
          </div>
          <div className="card">
            <p className="text-sm font-secondary text-foreground/70">Applied</p>
            <p className="text-3xl font-primary gradient-text">{appliedOpps.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-primary/30">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabSwitch('saved')}
                className={`px-6 py-3 text-sm font-secondary border-b-2 transition-colors ${
                  activeTab === 'saved'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/60 hover:text-foreground hover:border-primary/50'
                }`}
              >
                Saved ({savedOpps.length})
              </button>
              <button
                onClick={() => handleTabSwitch('applied')}
                className={`px-6 py-3 text-sm font-secondary border-b-2 transition-colors ${
                  activeTab === 'applied'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/60 hover:text-foreground hover:border-primary/50'
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
                <h3 className="text-xl font-primary mb-2 gradient-text">
                  No {activeTab} opportunities yet
                </h3>
                <p className="font-secondary text-foreground/70 mb-6">
                  {activeTab === 'saved'
                    ? 'Start saving opportunities from your dashboard'
                    : 'Mark opportunities as applied from your dashboard'}
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-primary"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOpps.map((opp, index) => (
                  <div
                    key={`${opp.id}-${index}`}
                    className="card hover:border-primary/50 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {opp.winRate && (
                            <span className={`px-3 py-1 rounded-full text-sm font-primary border ${
                              opp.winRate >= 70
                                ? 'bg-surface text-primary border-primary/50'
                                : opp.winRate >= 50
                                ? 'bg-surface text-secondary border-secondary/50'
                                : 'bg-surface text-foreground/50 border-primary/20'
                            }`}>
                              {opp.winRate}% Match
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-xl text-xs font-secondary border bg-surface text-primary border-primary/50">
                            {opp.type}
                          </span>
                          <span className={`px-2 py-1 rounded-xl text-xs font-secondary border ${
                            activeTab === 'saved'
                              ? 'bg-surface text-yellow-400 border-yellow-400/50'
                              : 'bg-surface text-green-400 border-green-400/50'
                          }`}>
                            {activeTab === 'saved' ? 'Saved' : 'Applied'}
                          </span>
                        </div>
                        <h3 className="text-lg font-primary mb-1 gradient-text">
                          {opp.title}
                        </h3>
                        <p className="text-sm font-secondary text-foreground/70 mb-2">
                          {opp.agency || 'Unknown Agency'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {opp.amount && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-foreground">{formatAmount(opp.amount)}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm font-secondary">
                        <span className="text-foreground/80">
                          Deadline: {formatDate(opp.closeDate || opp.deadline)}
                        </span>
                      </div>
                      {(opp.savedAt || opp.appliedAt) && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-foreground/60">
                            {activeTab === 'saved' ? 'Saved' : 'Applied'} on:{' '}
                            {formatDate(opp.savedAt || opp.appliedAt)}
                          </span>
                        </div>
                      )}
                      {(opp.city || opp.state) && (
                        <div className="flex items-center text-sm font-secondary">
                          <span className="text-foreground/80">
                            {[opp.city, opp.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {opp.description && (
                      <p className="text-sm font-secondary text-foreground/70 mb-4 line-clamp-2">
                        {opp.description}
                      </p>
                    )}

                    {opp.url && (
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary-light font-secondary flex items-center gap-1"
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


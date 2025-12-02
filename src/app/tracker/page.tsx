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
    if (!user) return;

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading tracker...</p>
        </div>
      </div>
    );
  }

  const displayedOpps = activeTab === 'saved' ? savedOpps : appliedOpps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Opportunity Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">
                {userProfile?.entityName || 'Your'} saved and applied opportunities
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Saved</p>
            <p className="text-3xl font-bold text-yellow-600">{savedOpps.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Applied</p>
            <p className="text-3xl font-bold text-green-600">{appliedOpps.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabSwitch('saved')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'saved'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Saved ({savedOpps.length})
              </button>
              <button
                onClick={() => handleTabSwitch('applied')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'applied'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <div className="text-6xl mb-4">
                  {activeTab === 'saved' ? '💾' : '✅'}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No {activeTab} opportunities yet
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'saved'
                    ? 'Start saving opportunities from your dashboard'
                    : 'Mark opportunities as applied from your dashboard'}
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOpps.map((opp, index) => (
                  <div
                    key={`${opp.id}-${index}`}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {opp.winRate && (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              opp.winRate >= 70
                                ? 'bg-green-100 text-green-600'
                                : opp.winRate >= 50
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {opp.winRate}% Match
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            opp.type === 'Grant'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {opp.type}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activeTab === 'saved'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {activeTab === 'saved' ? 'Saved' : 'Applied'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {opp.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {opp.agency || 'Unknown Agency'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {opp.amount && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">💰</span>
                          <span className="text-gray-700">{opp.amount}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 mr-2">📅</span>
                        <span className="text-gray-700">
                          Deadline: {formatDate(opp.closeDate || opp.deadline)}
                        </span>
                      </div>
                      {(opp.savedAt || opp.appliedAt) && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">🕒</span>
                          <span className="text-gray-700">
                            {activeTab === 'saved' ? 'Saved' : 'Applied'} on:{' '}
                            {formatDate(opp.savedAt || opp.appliedAt)}
                          </span>
                        </div>
                      )}
                      {(opp.city || opp.state) && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">📍</span>
                          <span className="text-gray-700">
                            {[opp.city, opp.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {opp.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {opp.description}
                      </p>
                    )}

                    {opp.url && (
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
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


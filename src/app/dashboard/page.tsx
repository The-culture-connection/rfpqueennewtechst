'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOpportunities } from '@/hooks/useOpportunities';
import OpportunityCard from '@/components/OpportunityCard';
import { doc, setDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { opportunities, loading, error } = useOpportunities(userProfile);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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

  const handlePass = async (id: string) => {
    setPassedIds([...passedIds, id]);
    // Move to next opportunity
    if (currentIndex < availableOpportunities.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const handleSave = async (id: string) => {
    if (!user) return;
    
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RFP Matcher</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {userProfile.entityName}!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/tracker')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                My Tracker
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Matches</p>
            <p className="text-2xl font-bold text-gray-900">{opportunities.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-2xl font-bold text-gray-900">{availableOpportunities.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Passed</p>
            <p className="text-2xl font-bold text-gray-900">{passedIds.length}</p>
          </div>
        </div>

        {/* Opportunity Card */}
        {currentOpportunity ? (
          <div className="relative">
            {actionLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <OpportunityCard
              opportunity={currentOpportunity}
              onPass={handlePass}
              onSave={handleSave}
              onApply={handleApply}
            />
            
            {/* Navigation hint */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Showing {currentIndex + 1} of {availableOpportunities.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You've reviewed all opportunities!
            </h2>
            <p className="text-gray-600 mb-6">
              Check your tracker to see saved and applied opportunities.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/tracker')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                View Tracker
              </button>
              <button
                onClick={() => {
                  setPassedIds([]);
                  setCurrentIndex(0);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Review Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


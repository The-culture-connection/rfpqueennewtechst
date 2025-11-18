'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FundingType, Timeline, Interest } from '@/types';
import FundingTypeStep from '@/components/onboarding/FundingTypeStep';
import TimelineStep from '@/components/onboarding/TimelineStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import EntityStep from '@/components/onboarding/EntityStep';

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const router = useRouter();
  
  const [fundingTypes, setFundingTypes] = useState<FundingType[]>([]);
  const [timeline, setTimeline] = useState<Timeline>('immediate');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Load current profile data
  useEffect(() => {
    if (userProfile) {
      setFundingTypes(userProfile.fundingType || []);
      setTimeline(userProfile.timeline || 'immediate');
      setInterests(userProfile.interestsMain || []);
      setEntityName(userProfile.entityName || '');
      setEntityType(userProfile.entityType || '');
    }
  }, [userProfile]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSave = async () => {
    if (!fundingTypes.length || !timeline || !interests.length || !entityName || !entityType) {
      alert('Please complete all fields');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        fundingType: fundingTypes,
        timeline: timeline,
        interestsMain: interests,
        grantsByInterest: interests,
        entityName: entityName,
        entityType: entityType,
        updatedAt: new Date(),
      } as any);

      alert('Profile updated successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
              <p className="text-sm text-gray-600 mt-1">
                Update your preferences to get better opportunity matches
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Funding Types Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Funding Types</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'funding' ? null : 'funding')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {activeSection === 'funding' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'funding' ? (
              <FundingTypeStep
                selected={fundingTypes}
                onChange={setFundingTypes}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {fundingTypes.map(type => (
                  <span key={type} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Timeline</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'timeline' ? null : 'timeline')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {activeSection === 'timeline' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'timeline' ? (
              <TimelineStep
                selected={timeline}
                onChange={setTimeline}
              />
            ) : (
              <p className="text-gray-700">{timeline}</p>
            )}
          </div>

          {/* Interests Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Areas of Interest</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'interests' ? null : 'interests')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {activeSection === 'interests' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'interests' ? (
              <InterestsStep
                selected={interests}
                onChange={setInterests}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {interests.map(interest => (
                  <span key={interest} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Entity Information Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Organization Information</h2>
              <button
                onClick={() => setActiveSection(activeSection === 'entity' ? null : 'entity')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                {activeSection === 'entity' ? 'Collapse' : 'Edit'}
              </button>
            </div>
            {activeSection === 'entity' ? (
              <EntityStep
                entityName={entityName}
                entityType={entityType as any}
                onChangeEntityName={setEntityName}
                onChangeEntityType={(type) => setEntityType(type)}
              />
            ) : (
              <div>
                <p className="text-gray-700 font-medium">{entityName}</p>
                <p className="text-gray-600 text-sm capitalize">{entityType}</p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


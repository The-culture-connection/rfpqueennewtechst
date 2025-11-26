'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FundingType, Timeline, EntityType, OnboardingData } from '@/types';
import FundingTypeStep from '@/components/onboarding/FundingTypeStep';
import TimelineStep from '@/components/onboarding/TimelineStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import EntityStep from '@/components/onboarding/EntityStep';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
  });

  const { updateUserProfile } = useAuth();
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      console.log('💾 Saving profile...', data);
      
      // Save profile to Firestore
      await updateUserProfile({
        fundingType: data.fundingTypes || [],
        timeline: data.timeline || 'immediate',
        interestsMain: data.interests || [],
        grantsByInterest: data.interests || [],
        entityName: data.entityName || '',
        entityType: data.entityType || 'nonprofit',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      console.log('✅ Profile saved successfully!');
      
      // Longer delay to ensure Firestore propagation and state update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to dashboard
      console.log('🔄 Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData({ ...data, ...updates });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {currentStep === 1 && (
            <FundingTypeStep
              selected={data.fundingTypes || []}
              onChange={(types) => updateData({ fundingTypes: types })}
            />
          )}

          {currentStep === 2 && (
            <TimelineStep
              selected={data.timeline}
              onChange={(timeline) => updateData({ timeline })}
            />
          )}

          {currentStep === 3 && (
            <InterestsStep
              selected={data.interests || []}
              onChange={(interests) => updateData({ interests })}
            />
          )}

          {currentStep === 4 && (
            <EntityStep
              entityName={data.entityName || ''}
              entityType={data.entityType}
              onChangeEntityName={(name) => updateData({ entityName: name })}
              onChangeEntityType={(type) => updateData({ entityType: type })}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!data.fundingTypes || data.fundingTypes.length === 0)) ||
                  (currentStep === 2 && !data.timeline) ||
                  (currentStep === 3 && (!data.interests || data.interests.length === 0))
                }
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading || !data.entityName || !data.entityType}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


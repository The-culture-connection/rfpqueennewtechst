'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FundingType, Timeline, EntityType, OnboardingData } from '@/types';
import FundingTypeStep from '@/components/onboarding/FundingTypeStep';
import TimelineStep from '@/components/onboarding/TimelineStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import EntityStep from '@/components/onboarding/EntityStep';
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingFundingTypeSelected,
  trackOnboardingTimelineSelected,
  trackOnboardingInterestsSelected,
  trackOnboardingEntityTypeSelected,
  trackOnboardingCompleted,
} from '@/lib/analytics';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
  });

  const { updateUserProfile } = useAuth();
  const router = useRouter();

  // Track onboarding start on mount
  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      // Track step completion
      const stepNames = ['funding_type', 'timeline', 'interests', 'entity'];
      trackOnboardingStepCompleted(currentStep, stepNames[currentStep - 1]);
      
      // Track specific step data
      if (currentStep === 1 && data.fundingTypes) {
        trackOnboardingFundingTypeSelected(data.fundingTypes);
      } else if (currentStep === 2 && data.timeline) {
        trackOnboardingTimelineSelected(data.timeline);
      } else if (currentStep === 3 && data.interests) {
        trackOnboardingInterestsSelected(data.interests);
      }
      
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
      
      // Track entity type selection
      if (data.entityType) {
        trackOnboardingEntityTypeSelected(data.entityType);
      }
      
      const profile = {
        fundingType: data.fundingTypes || [],
        timeline: data.timeline || 'immediate',
        interestsMain: data.interests || [],
        grantsByInterest: data.interests || [],
        entityName: data.entityName || '',
        entityType: data.entityType || 'nonprofit',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      
      // Save profile to Firestore
      await updateUserProfile(profile);

      // Track onboarding completion
      trackOnboardingCompleted(profile);

      console.log('✅ Profile saved successfully!');
      
      // Wait for state to update and Firestore to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Use replace instead of push to prevent back navigation issues
      console.log('🔄 Redirecting to dashboard...');
      router.replace('/dashboard');
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
    <div className="min-h-screen bg-[#1d1d1e] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-primary text-[#ad3c94]">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-secondary text-[#e7e8ef]/80">
              {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-full h-2">
            <div
              className="bg-[#ad3c94] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg shadow-xl p-8">
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
              className="px-6 py-2 font-secondary text-[#e7e8ef] bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg hover:bg-[#1d1d1e]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                className="px-6 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading || !data.entityName || !data.entityType}
                className="px-6 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-secondary"
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


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

  const { user, userProfile, updateUserProfile } = useAuth();
  const router = useRouter();

  // Check if terms are accepted before allowing onboarding
  useEffect(() => {
    if (user && userProfile) {
      if (!userProfile.termsAccepted) {
        // Terms not accepted, redirect to terms page
        router.replace('/terms');
        return;
      }
    } else if (user && !userProfile) {
      // User exists but profile is loading, wait a bit
      const timer = setTimeout(() => {
        // If still no profile after 2 seconds, check again
        if (!userProfile || !userProfile?.termsAccepted) {
          router.replace('/terms');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, userProfile, router]);

  // Track onboarding start on mount
  useEffect(() => {
    if (userProfile?.termsAccepted) {
      trackOnboardingStarted();
    }
  }, [userProfile?.termsAccepted]);

  const handleNext = () => {
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
    } else if (currentStep === 4 && data.entityType) {
      trackOnboardingEntityTypeSelected(data.entityType);
    }
    
    // If on last step, complete onboarding
    if (currentStep === TOTAL_STEPS) {
      handleComplete();
    } else {
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
      
      // Clear opportunity cache when profile is created
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('cached_opportunities');
          localStorage.removeItem('cached_opportunities_timestamp');
          localStorage.removeItem('cached_opportunities_profile');
          console.log('✅ Cleared opportunity cache');
        } catch (err) {
          console.warn('Error clearing cache:', err);
        }
      }
      
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
    <div className="min-h-screen gradient-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-primary gradient-text">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-secondary text-foreground/70">
              {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-surface border border-primary/20 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
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
          {currentStep <= TOTAL_STEPS && (
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!data.fundingTypes || data.fundingTypes.length === 0)) ||
                  (currentStep === 2 && !data.timeline) ||
                  (currentStep === 3 && (!data.interests || data.interests.length === 0)) ||
                  (currentStep === 4 && (!data.entityName || !data.entityType))
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === TOTAL_STEPS ? 'Complete' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


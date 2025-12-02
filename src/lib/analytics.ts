// Firebase Analytics utility functions
import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';
import { UserProfile, FundingType, EntityType, Timeline } from '@/types';

/**
 * Check if analytics is available
 */
function isAnalyticsAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const analytics = getAnalyticsInstance();
  return analytics !== null;
}

/**
 * Get analytics instance
 */
function getAnalytics(): ReturnType<typeof getAnalyticsInstance> {
  return getAnalyticsInstance();
}

/**
 * Log a custom event to Firebase Analytics
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  if (typeof window === 'undefined') {
    // Server-side: don't track
    return;
  }

  const analytics = getAnalytics();
  if (!analytics) {
    console.warn('[Analytics] ⚠️ Event not tracked (analytics not initialized):', eventName, eventParams);
    return;
  }

  try {
    logEvent(analytics, eventName, eventParams);
    console.log('[Analytics] ✅ Event tracked:', eventName, eventParams);
  } catch (error) {
    console.error('[Analytics] ❌ Error tracking event:', error, eventName, eventParams);
  }
}

/**
 * Set user ID for analytics
 */
export function setAnalyticsUserId(userId: string | null): void {
  if (typeof window === 'undefined' || !userId) return;

  const analytics = getAnalytics();
  if (!analytics) {
    console.warn('[Analytics] ⚠️ Cannot set user ID (analytics not initialized)');
    return;
  }

  try {
    setUserId(analytics, userId);
    console.log('[Analytics] ✅ User ID set:', userId);
  } catch (error) {
    console.error('[Analytics] ❌ Error setting user ID:', error);
  }
}

/**
 * Set user properties for analytics
 */
export function setAnalyticsUserProperties(profile: UserProfile | null): void {
  if (typeof window === 'undefined' || !profile) return;

  const analytics = getAnalytics();
  if (!analytics) {
    console.warn('[Analytics] ⚠️ Cannot set user properties (analytics not initialized)');
    return;
  }

  try {
    setUserProperties(analytics, {
      entity_type: profile.entityType,
      funding_types: profile.fundingType?.join(',') || '',
      timeline: profile.timeline,
      interests_count: profile.interestsMain?.length || 0,
      has_completed_onboarding: !!(profile.entityName && profile.fundingType?.length > 0),
    });
    console.log('[Analytics] ✅ User properties set:', {
      entity_type: profile.entityType,
      funding_types: profile.fundingType?.join(','),
      timeline: profile.timeline,
    });
  } catch (error) {
    console.error('[Analytics] ❌ Error setting user properties:', error);
  }
}

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

export function trackSignUp(method: 'email' = 'email'): void {
  trackEvent('sign_up', { method });
}

export function trackLogin(method: 'email' = 'email'): void {
  trackEvent('login', { method });
}

export function trackLogout(): void {
  trackEvent('logout');
}

// ============================================================================
// ONBOARDING EVENTS
// ============================================================================

export function trackOnboardingStarted(): void {
  trackEvent('onboarding_started');
}

export function trackOnboardingStepCompleted(step: number, stepName: string): void {
  trackEvent('onboarding_step_completed', {
    step_number: step,
    step_name: stepName,
  });
}

export function trackOnboardingFundingTypeSelected(fundingTypes: FundingType[]): void {
  trackEvent('onboarding_funding_type_selected', {
    funding_types: fundingTypes.join(','),
    funding_types_count: fundingTypes.length,
  });
}

export function trackOnboardingTimelineSelected(timeline: Timeline): void {
  trackEvent('onboarding_timeline_selected', { timeline });
}

export function trackOnboardingInterestsSelected(interests: string[]): void {
  trackEvent('onboarding_interests_selected', {
    interests: interests.join(','),
    interests_count: interests.length,
  });
}

export function trackOnboardingEntityTypeSelected(entityType: EntityType): void {
  trackEvent('onboarding_entity_type_selected', { entity_type: entityType });
}

export function trackOnboardingCompleted(profile: UserProfile): void {
  trackEvent('onboarding_completed', {
    entity_type: profile.entityType,
    funding_types: profile.fundingType?.join(',') || '',
    timeline: profile.timeline,
    interests_count: profile.interestsMain?.length || 0,
  });
}

// ============================================================================
// DASHBOARD & OPPORTUNITIES EVENTS
// ============================================================================

export function trackDashboardViewed(opportunitiesCount: number): void {
  trackEvent('dashboard_viewed', {
    opportunities_count: opportunitiesCount,
  });
}

export function trackOpportunityViewed(
  opportunityId: string,
  winRate: number,
  opportunityType: 'RFP' | 'Grant',
  hasDeadline: boolean
): void {
  trackEvent('opportunity_viewed', {
    opportunity_id: opportunityId,
    win_rate: winRate,
    opportunity_type: opportunityType,
    has_deadline: hasDeadline,
  });
}

export function trackOpportunityPassed(
  opportunityId: string,
  winRate: number,
  opportunityType: 'RFP' | 'Grant'
): void {
  trackEvent('opportunity_passed', {
    opportunity_id: opportunityId,
    win_rate: winRate,
    opportunity_type: opportunityType,
  });
}

export function trackOpportunitySaved(
  opportunityId: string,
  winRate: number,
  opportunityType: 'RFP' | 'Grant',
  amount?: string
): void {
  trackEvent('opportunity_saved', {
    opportunity_id: opportunityId,
    win_rate: winRate,
    opportunity_type: opportunityType,
    has_amount: !!amount,
  });
}

export function trackOpportunityApplied(
  opportunityId: string,
  winRate: number,
  opportunityType: 'RFP' | 'Grant',
  amount?: string
): void {
  trackEvent('opportunity_applied', {
    opportunity_id: opportunityId,
    win_rate: winRate,
    opportunity_type: opportunityType,
    has_amount: !!amount,
  });
}

export function trackOpportunityUrlClicked(opportunityId: string): void {
  trackEvent('opportunity_url_clicked', {
    opportunity_id: opportunityId,
  });
}

export function trackDashboardStartOver(): void {
  trackEvent('dashboard_start_over');
}

// ============================================================================
// TRACKER EVENTS
// ============================================================================

export function trackTrackerViewed(tab: 'saved' | 'applied', count: number): void {
  trackEvent('tracker_viewed', {
    tab,
    count,
  });
}

export function trackTrackerTabSwitched(tab: 'saved' | 'applied'): void {
  trackEvent('tracker_tab_switched', { tab });
}

// ============================================================================
// DOCUMENTS EVENTS
// ============================================================================

export function trackDocumentsPageViewed(): void {
  trackEvent('documents_page_viewed');
}

export function trackDocumentUploadStarted(documentType: string): void {
  trackEvent('document_upload_started', {
    document_type: documentType,
  });
}

export function trackDocumentUploadCompleted(
  documentType: string,
  fileSize: number,
  fileType: string
): void {
  trackEvent('document_upload_completed', {
    document_type: documentType,
    file_size_kb: Math.round(fileSize / 1024),
    file_type: fileType,
  });
}

export function trackDocumentUploadFailed(documentType: string, error: string): void {
  trackEvent('document_upload_failed', {
    document_type: documentType,
    error,
  });
}

export function trackDocumentProcessingCompleted(documentType: string): void {
  trackEvent('document_processing_completed', {
    document_type: documentType,
  });
}

export function trackDocumentProcessingFailed(documentType: string, error: string): void {
  trackEvent('document_processing_failed', {
    document_type: documentType,
    error,
  });
}

export function trackDocumentReplaced(documentType: string): void {
  trackEvent('document_replaced', {
    document_type: documentType,
  });
}

// ============================================================================
// PROFILE EVENTS
// ============================================================================

export function trackProfileViewed(): void {
  trackEvent('profile_viewed');
}

export function trackProfileUpdated(updatedFields: string[]): void {
  trackEvent('profile_updated', {
    updated_fields: updatedFields.join(','),
    updated_fields_count: updatedFields.length,
  });
}

// ============================================================================
// ENGAGEMENT & RETENTION EVENTS
// ============================================================================

export function trackSessionStart(): void {
  trackEvent('session_start');
}

export function trackSessionEnd(duration: number): void {
  trackEvent('session_end', {
    session_duration_seconds: duration,
  });
}

export function trackFeatureDiscovery(featureName: string, location: string): void {
  trackEvent('feature_discovery', {
    feature_name: featureName,
    location,
  });
}

export function trackError(errorType: string, errorMessage: string, location: string): void {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    location,
  });
}

// ============================================================================
// MONETIZATION EVENTS
// ============================================================================

export function trackPremiumFeatureViewed(featureName: string): void {
  trackEvent('premium_feature_viewed', {
    feature_name: featureName,
  });
}

export function trackPremiumUpgradePromptShown(featureName: string, location: string): void {
  trackEvent('premium_upgrade_prompt_shown', {
    feature_name: featureName,
    location,
  });
}

export function trackPremiumUpgradeClicked(featureName: string, location: string): void {
  trackEvent('premium_upgrade_clicked', {
    feature_name: featureName,
    location,
  });
}

export function trackSubscriptionStarted(tier: string, price: number): void {
  trackEvent('subscription_started', {
    subscription_tier: tier,
    price,
  });
}

export function trackSubscriptionCancelled(tier: string, reason?: string): void {
  trackEvent('subscription_cancelled', {
    subscription_tier: tier,
    cancellation_reason: reason || 'unknown',
  });
}

// ============================================================================
// CONVERSION FUNNEL EVENTS
// ============================================================================

export function trackFunnelStep(step: string, stepNumber: number, value?: number): void {
  trackEvent('funnel_step', {
    step_name: step,
    step_number: stepNumber,
    value,
  });
}

// ============================================================================
// SEARCH & FILTER EVENTS
// ============================================================================

export function trackSearchPerformed(query: string, resultsCount: number): void {
  trackEvent('search_performed', {
    search_query: query,
    results_count: resultsCount,
  });
}

export function trackFilterApplied(filterType: string, filterValue: string): void {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}


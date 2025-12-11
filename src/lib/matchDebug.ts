import { Opportunity, UserProfile, Interest, FundingType, Timeline } from '@/types';
import { calculateWinRate } from './matchAlgorithm';

/**
 * Comprehensive debug function for opportunity scoring
 * Logs detailed breakdown of all scoring components
 */
export function debugOpportunityScore(
  opportunity: Opportunity,
  profile: UserProfile,
  label: string = ''
) {
  const title = `${opportunity.title || 'NO TITLE'} (${opportunity.id || 'no-id'})`;
  console.group(`🔍 Debug scoring: ${title} ${label ? `– ${label}` : ''}`);

  console.log('📋 Profile Data:', {
    entityType: profile.entityType,
    fundingType: profile.fundingType,
    interestsMain: profile.interestsMain,
    grantsByInterest: profile.grantsByInterest,
    keywords: profile.keywords,
    negativeKeywords: profile.negativeKeywords,
    timeline: profile.timeline,
  });

  console.log('📋 Opportunity Data:', {
    id: opportunity.id,
    title: opportunity.title,
    type: opportunity.type,
    agency: opportunity.agency,
    category: opportunity.category,
    description: opportunity.description?.substring(0, 200) + '...',
    closeDate: opportunity.closeDate,
    deadline: opportunity.deadline,
    applicantTypes: opportunity.applicantTypes,
    fundingActivityCategories: opportunity.fundingActivityCategories,
    eligibleEntities: opportunity.eligibleEntities,
  });

  // Calculate and log each component
  const winRate = calculateWinRate(opportunity, profile);
  console.log('🎯 Final winRate (%):', winRate);

  console.groupEnd();
}

/**
 * Debug pre-filtering results
 */
export function debugPreFilter(
  opportunity: Opportunity,
  entityType: string,
  passed: boolean,
  reason?: string
) {
  console.log(`🔍 [PreFilter] ${passed ? '✅ PASSED' : '❌ FILTERED OUT'}:`, {
    title: opportunity.title,
    id: opportunity.id,
    entityType,
    reason: reason || (passed ? 'Eligible' : 'Ineligible'),
    applicantTypes: opportunity.applicantTypes,
    fundingActivityCategories: opportunity.fundingActivityCategories,
  });
}


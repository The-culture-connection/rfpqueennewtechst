import { Opportunity, FitScoreComponents } from '@/types';

/**
 * Generate detailed match reasoning from fit components
 */
export function generateMatchReasoning(
  opportunity: Opportunity,
  fitComponents?: FitScoreComponents
): string[] {
  const reasons: string[] = [];
  
  if (!fitComponents) {
    return reasons;
  }
  
  // Eligibility fit
  if (fitComponents.eligibilityFit >= 0.9) {
    reasons.push('✓ Strong eligibility match - organization type and requirements align perfectly');
  } else if (fitComponents.eligibilityFit >= 0.7) {
    reasons.push('✓ Good eligibility match - meets most requirements');
  } else if (fitComponents.eligibilityFit < 0.5) {
    reasons.push('⚠ Partial eligibility - some requirements may not fully align');
  }
  
  // Interest/Keyword fit
  if (fitComponents.interestKeywordFit >= 0.8) {
    reasons.push('✓ Excellent interest alignment - strong keyword and topic matches');
  } else if (fitComponents.interestKeywordFit >= 0.6) {
    reasons.push('✓ Good interest alignment - relevant keywords and topics found');
  } else if (fitComponents.interestKeywordFit >= 0.4) {
    reasons.push('○ Moderate interest alignment - some relevant keywords found');
  } else {
    reasons.push('⚠ Limited interest alignment - few matching keywords');
  }
  
  // Structure fit
  if (fitComponents.structureFit >= 0.8) {
    reasons.push('✓ Strong organizational structure match');
  } else if (fitComponents.structureFit >= 0.6) {
    reasons.push('○ Good organizational structure match');
  }
  
  // Population fit
  if (fitComponents.populationFit >= 0.8) {
    reasons.push('✓ Strong population served alignment');
  } else if (fitComponents.populationFit >= 0.6) {
    reasons.push('○ Good population served alignment');
  }
  
  // Amount fit
  if (fitComponents.amountFit >= 0.8) {
    reasons.push('✓ Funding amount aligns well with your typical needs');
  } else if (fitComponents.amountFit >= 0.6) {
    reasons.push('○ Funding amount is within a reasonable range');
  } else if (fitComponents.amountFit < 0.4) {
    reasons.push('⚠ Funding amount may not fully match your needs');
  }
  
  // Timing fit
  if (fitComponents.timingFit >= 0.9) {
    reasons.push('✓ Perfect timing match - deadline aligns with your timeline preferences');
  } else if (fitComponents.timingFit >= 0.7) {
    reasons.push('✓ Good timing match - deadline is manageable');
  } else if (fitComponents.timingFit >= 0.5) {
    reasons.push('○ Moderate timing - deadline may require adjustment to your schedule');
  } else {
    reasons.push('⚠ Timing may be tight - consider your capacity');
  }
  
  return reasons;
}

/**
 * Generate a concise match summary
 */
export function generateMatchSummary(fitComponents?: FitScoreComponents): string {
  if (!fitComponents) {
    return 'Match analysis not available';
  }
  
  const scores = [
    { name: 'Eligibility', value: fitComponents.eligibilityFit },
    { name: 'Interests', value: fitComponents.interestKeywordFit },
    { name: 'Structure', value: fitComponents.structureFit },
    { name: 'Population', value: fitComponents.populationFit },
    { name: 'Amount', value: fitComponents.amountFit },
    { name: 'Timing', value: fitComponents.timingFit }
  ];
  
  const topScores = scores
    .filter(s => s.value >= 0.7)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(s => `${s.name} (${Math.round(s.value * 100)}%)`)
    .join(', ');
  
  if (topScores) {
    return `Strong matches: ${topScores}`;
  }
  
  return 'Moderate overall match';
}


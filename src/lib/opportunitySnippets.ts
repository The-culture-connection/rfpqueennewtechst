import { Opportunity } from '@/types';
import { UserProfile } from '@/types';

/**
 * Extract structured information from opportunity (Option 3)
 * Returns key info like purpose, funding amount, deadline
 */
function extractStructuredSnippet(opportunity: Opportunity): string {
  const parts: string[] = [];
  const desc = (opportunity.description || '').toLowerCase();
  
  // Funding amount
  if (opportunity.amount) {
    parts.push(`Funding: ${opportunity.amount}`);
  }
  
  // Purpose/Objective
  const purposeMatch = opportunity.description?.match(
    /(?:purpose|objective|goal|aim|supports|funds|provides)[^.]{0,150}\./i
  );
  if (purposeMatch && purposeMatch[0]) {
    parts.push(purposeMatch[0].trim());
  }
  
  // Eligibility info
  const eligibilityMatch = opportunity.description?.match(
    /(?:eligible|qualify|open to|available to)[^.]{0,100}\./i
  );
  if (eligibilityMatch && eligibilityMatch[0]) {
    parts.push(eligibilityMatch[0].trim());
  }
  
  // Deadline urgency
  if (opportunity.closeDate) {
    try {
      const deadline = new Date(opportunity.closeDate);
      const today = new Date();
      const days = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 30) {
        parts.push(`Deadline in ${days} days`);
      }
    } catch {
      // Ignore date parsing errors
    }
  }
  
  return parts.join(' • ') || '';
}

/**
 * Extract keyword-prioritized snippet (Option 2)
 * Prioritizes sentences containing user keywords
 */
function extractKeywordSnippet(
  description: string,
  keywords: string[],
  maxLength: number = 200
): string {
  if (!description || !keywords.length) return '';
  
  const sentences = description.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) {
    // No sentence endings, just truncate at word boundary
    return description.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  const keywordSentences: string[] = [];
  const otherSentences: string[] = [];
  
  // Categorize sentences by keyword presence
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const hasKeyword = keywords.some(kw => 
      lowerSentence.includes(kw.toLowerCase())
    );
    if (hasKeyword) {
      keywordSentences.push(sentence);
    } else {
      otherSentences.push(sentence);
    }
  });
  
  // Prioritize keyword sentences
  const prioritized = [...keywordSentences, ...otherSentences];
  let snippet = '';
  for (const sentence of prioritized) {
    if ((snippet + sentence).length <= maxLength) {
      snippet += sentence;
    } else {
      break;
    }
  }
  
  // If we have a snippet, return it; otherwise use first sentence or truncate description
  if (snippet) {
    return snippet;
  }
  
  // Fallback: use first sentence if available, otherwise truncate description
  if (sentences.length > 0 && sentences[0]) {
    return sentences[0].substring(0, maxLength) + '...';
  }
  
  return description.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Smart sentence extraction (Option 1)
 * Extracts first 1-2 complete sentences
 */
function extractSmartSnippet(description: string, maxLength: number = 200): string {
  if (!description) return '';
  
  // Remove extra whitespace
  const clean = description.trim().replace(/\s+/g, ' ');
  
  // Find sentences
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    // No sentence endings, just truncate at word boundary
    return clean.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  // Take sentences until we hit maxLength
  let snippet = '';
  for (const sentence of sentences) {
    if ((snippet + sentence).length <= maxLength) {
      snippet += sentence;
    } else {
      break;
    }
  }
  
  // If we have a snippet, return it; otherwise use first sentence or truncate
  if (snippet) {
    return snippet;
  }
  
  // Fallback: use first sentence if available, otherwise truncate description
  if (sentences.length > 0 && sentences[0]) {
    return sentences[0].substring(0, maxLength) + '...';
  }
  
  return clean.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Generate in-depth opportunity summary focused on interests and keywords
 */
export function getInDepthSummary(
  opportunity: Opportunity,
  fitComponents?: { eligibilityFit: number; interestKeywordFit: number; structureFit: number; populationFit: number; amountFit: number; timingFit: number },
  positiveKeywordMatches?: string[],
  userProfile?: { interestsMain?: string[]; grantsByInterest?: string[]; keywords?: string[]; positiveKeywords?: string[]; negativeKeywords?: string[] } | null
): string {
  const parts: string[] = [];
  
  // Interest alignment
  const interests = userProfile?.interestsMain || userProfile?.grantsByInterest || [];
  if (interests.length > 0) {
    const interestLabels: Record<string, string> = {
      'arts': 'arts and culture',
      'social-services': 'social services',
      'economic-development': 'economic development',
      'healthcare': 'healthcare',
      'education': 'education',
      'environment': 'environment',
      'technology': 'technology',
      'housing': 'housing',
      'research': 'research',
      'infrastructure': 'infrastructure'
    };
    const formattedInterests = interests.slice(0, 3).map(i => interestLabels[i] || i);
    if (formattedInterests.length > 0) {
      parts.push(`Aligns with your interests in ${formattedInterests.join(', ')}${interests.length > 3 ? ', and more' : ''}.`);
    }
  }
  
  // Document-extracted keywords (if available)
  const documentKeywords = userProfile?.keywords || [];
  if (documentKeywords.length > 0 && fitComponents && fitComponents.interestKeywordFit >= 0.6) {
    parts.push(`Matches keywords extracted from your documents, indicating strong alignment with your organization's actual work.`);
  }
  
  // Positive keyword matches (user-defined priority keywords)
  if (positiveKeywordMatches && positiveKeywordMatches.length > 0) {
    parts.push(`Contains your priority keywords: ${positiveKeywordMatches.slice(0, 4).join(', ')}${positiveKeywordMatches.length > 4 ? '...' : ''} - these are terms you've explicitly indicated you want to see more of.`);
  }
  
  // Negative keyword warning (if opportunity might contain excluded terms)
  if (userProfile?.negativeKeywords && userProfile.negativeKeywords.length > 0) {
    const oppText = ((opportunity.title || '') + ' ' + (opportunity.description || '')).toLowerCase();
    const negativeMatches = userProfile.negativeKeywords.filter(kw => 
      kw && oppText.includes(kw.toLowerCase())
    );
    if (negativeMatches.length === 0) {
      parts.push(`Does not contain any of your excluded keywords, which is a positive indicator.`);
    }
  }
  
  // Interest keyword fit
  if (fitComponents && fitComponents.interestKeywordFit >= 0.8) {
    parts.push(`Shows excellent keyword alignment with your interests and profile.`);
  } else if (fitComponents && fitComponents.interestKeywordFit >= 0.6) {
    parts.push(`Shows good keyword alignment with your interests.`);
  } else if (fitComponents && fitComponents.interestKeywordFit < 0.4) {
    parts.push(`Limited keyword alignment - may not fully match your focus areas.`);
  }
  
  // Eligibility
  if (fitComponents && fitComponents.eligibilityFit >= 0.9) {
    parts.push(`Strong eligibility match for your organization type.`);
  }
  
  return parts.join(' ');
}

/**
 * Hybrid snippet extraction (Option 5)
 * Tries structured → keyword-prioritized → smart extraction
 */
export function getOpportunitySnippet(
  opportunity: Opportunity,
  userKeywords?: string[]
): string {
  const maxLength = 300; // Increased for more in-depth description
  
  // 1) Try structured extraction first
  const structured = extractStructuredSnippet(opportunity);
  if (structured && structured.length > 50) {
    return structured;
  }
  
  // 2) Try keyword-prioritized if keywords available
  if (userKeywords && userKeywords.length > 0 && opportunity.description) {
    const keywordSnippet = extractKeywordSnippet(
      opportunity.description,
      userKeywords,
      maxLength
    );
    if (keywordSnippet.length > 50) {
      return keywordSnippet;
    }
  }
  
  // 3) Fallback to smart extraction
  if (opportunity.description) {
    return extractSmartSnippet(opportunity.description, maxLength);
  }
  
  return '';
}

/**
 * Build "Why this is a match" line from structured data
 */
export function buildWhyMatchLine(
  userProfile: UserProfile | null | undefined,
  opportunity: Opportunity
): string {
  const parts: string[] = [];
  
  // Entity type match
  if (userProfile?.entityType && opportunity.type) {
    const entityLabels: Record<string, string> = {
      'nonprofit': 'nonprofits',
      'for-profit': 'for-profit businesses',
      'for_profit': 'for-profit businesses',
      'government': 'government entities',
      'education': 'educational institutions',
      'individual': 'individuals'
    };
    const label = entityLabels[userProfile.entityType] || userProfile.entityType;
    parts.push(label);
  }
  
  // Sectors/interests (if we can extract them from the opportunity)
  // Note: This would ideally come from the matched sectors, but for now we'll use a simple approach
  const interests = userProfile?.interestsMain || userProfile?.grantsByInterest || [];
  if (interests.length > 0) {
    const topInterests = interests.slice(0, 2);
    const interestLabels = topInterests.map(i => {
      const labels: Record<string, string> = {
        'arts': 'arts',
        'social-services': 'social services',
        'economic-development': 'economic development',
        'healthcare': 'healthcare',
        'education': 'education',
        'environment': 'environment',
        'technology': 'technology',
        'housing': 'housing',
        'research': 'research',
        'infrastructure': 'infrastructure'
      };
      return labels[i] || i;
    });
    if (interestLabels.length > 0) {
      parts.push(`working in ${interestLabels.join(' and ')}`);
    }
  }
  
  // Location (if available)
  if (opportunity.state) {
    parts.push(`in ${opportunity.state}`);
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return `For ${parts.join(' ')}.`;
}


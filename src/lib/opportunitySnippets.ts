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
  if (purposeMatch) {
    parts.push(purposeMatch[0].trim());
  }
  
  // Eligibility info
  const eligibilityMatch = opportunity.description?.match(
    /(?:eligible|qualify|open to|available to)[^.]{0,100}\./i
  );
  if (eligibilityMatch) {
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
  
  return snippet || sentences[0].substring(0, maxLength) + '...';
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
  
  return snippet || sentences[0].substring(0, maxLength) + '...';
}

/**
 * Hybrid snippet extraction (Option 5)
 * Tries structured → keyword-prioritized → smart extraction
 */
export function getOpportunitySnippet(
  opportunity: Opportunity,
  userKeywords?: string[]
): string {
  const maxLength = 200;
  
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


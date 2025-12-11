import { Opportunity, UserProfile, FitScoreComponents, MatchReasoning } from '@/types';

/**
 * Intelligent Matching Algorithm
 * Uses business profile, interests, and behavioral data for personalized opportunity matching
 */

interface KeywordMatch {
  keyword: string;
  context: string;
  relevance: 'high' | 'medium' | 'low';
}

export function intelligentMatchOpportunities(
  opportunities: Opportunity[],
  profile: UserProfile
): Opportunity[] {
  console.log('🧠 Intelligent Matching Algorithm Starting...');
  console.log('📊 Profile Keywords:', {
    regular: profile.keywords?.length || 0,
    positive: profile.positiveKeywords?.length || 0,
    negative: profile.negativeKeywords?.length || 0
  });
  
  if (profile.positiveKeywords && profile.positiveKeywords.length > 0) {
    console.log('✅ Positive Keywords (Include):', profile.positiveKeywords);
  }
  
  if (profile.negativeKeywords && profile.negativeKeywords.length > 0) {
    console.log('🚫 Negative Keywords (Exclude):', profile.negativeKeywords);
  }
  
  // STEP 1: Filter out passed/saved opportunities FIRST
  const passedIds = profile.preferences?.passedOpportunityIds || [];
  const savedIds = profile.preferences?.savedOpportunityIds || [];
  const allExcludedIds = new Set([...passedIds, ...savedIds]);
  
  const notPassedOrSaved = opportunities.filter(opp => !allExcludedIds.has(opp.id));
  console.log(`[intelligentMatchOpportunities] Filtered out passed/saved: ${opportunities.length} → ${notPassedOrSaved.length} opportunities`);
  
  // STEP 2: Hard filter by negative keywords in title
  const negativeKeywords = profile.negativeKeywords || [];
  const filteredByNegatives = notPassedOrSaved.filter(opp => {
    if (negativeKeywords.length === 0) return true;
    
    const titleLower = (opp.title || '').toLowerCase();
    for (const negKeyword of negativeKeywords) {
      const negLower = negKeyword.toLowerCase().trim();
      if (negLower.length > 0 && titleLower.includes(negLower)) {
        console.log('🚫 [intelligentMatchOpportunities] HARD FILTER - Negative keyword in title:', {
          title: opp.title?.substring(0, 50),
          negativeKeyword: negKeyword,
        });
        return false; // Hard stop - never include
      }
    }
    return true;
  });
  
  console.log(`[intelligentMatchOpportunities] Filtered by negative keywords: ${notPassedOrSaved.length} → ${filteredByNegatives.length} opportunities`);
  
  return filteredByNegatives.map(opp => {
    const fitComponents = calculateDetailedFit(opp, profile);
    const matchScore = calculateWeightedMatchScore(fitComponents, profile);
    const matchReasoning = generateMatchReasoning(opp, profile, fitComponents);
    const personalizedDescription = generatePersonalizedDescription(opp, profile, fitComponents, matchReasoning);
    
    return {
      ...opp,
      matchScore,
      fitComponents,
      matchReasoning,
      personalizedDescription,
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

function calculateDetailedFit(
  opportunity: Opportunity,
  profile: UserProfile
): FitScoreComponents {
  const bp = profile.businessProfile;
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  
  // Calculate keyword fit with positive/negative keywords
  const keywordFit = calculateKeywordFit(opportunity, profile);
  
  return {
    eligibilityFit: calculateEligibilityFit(opportunity, profile),
    interestKeywordFit: keywordFit.interestFit,
    structureFit: calculateStructureFit(opportunity, profile),
    populationFit: calculatePopulationFit(opportunity, profile),
    amountFit: calculateAmountFit(opportunity, profile),
    timingFit: calculateTimingFit(opportunity, profile),
    businessProfileFit: bp ? calculateBusinessProfileFit(opportunity, bp) : 0,
    capabilityFit: bp ? calculateCapabilityFit(opportunity, bp) : 0,
    experienceFit: bp ? calculateExperienceFit(opportunity, bp) : 0,
    missionFit: bp ? calculateMissionFit(opportunity, bp) : 0,
    userPreferenceFit: calculateUserPreferenceFit(opportunity, profile),
  };
}

function calculateEligibilityFit(opportunity: Opportunity, profile: UserProfile): number {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  let score = 0.5; // Base score
  
  // Entity type matching
  const entityKeywords: { [key: string]: string[] } = {
    'nonprofit': ['nonprofit', 'non-profit', '501c3', 'charitable', 'ngo'],
    'for-profit': ['for-profit', 'business', 'company', 'enterprise', 'commercial'],
    'government': ['government', 'municipal', 'state', 'federal', 'public sector'],
    'education': ['education', 'school', 'university', 'college', 'academic'],
    'individual': ['individual', 'person', 'entrepreneur', 'sole proprietor'],
  };
  
  const userEntityKeywords = entityKeywords[profile.entityType] || [];
  const hasEntityMatch = userEntityKeywords.some(kw => oppText.includes(kw));
  
  if (hasEntityMatch) score += 0.3;
  
  // Check for exclusions
  const otherEntityTypes = Object.keys(entityKeywords).filter(k => k !== profile.entityType);
  const hasExclusion = otherEntityTypes.some(entityType => {
    const keywords = entityKeywords[entityType];
    return keywords.some(kw => oppText.includes(`only ${kw}`) || oppText.includes(`${kw} only`));
  });
  
  if (hasExclusion) score -= 0.4;
  
  // Funding type alignment
  const oppType = opportunity.type.toLowerCase();
  const hasFundingMatch = profile.fundingType.some(ft => {
    if (ft === 'grants' && oppType.includes('grant')) return true;
    if (ft === 'rfps' && (oppType.includes('rfp') || oppType.includes('proposal'))) return true;
    if (ft === 'contracts' && oppType.includes('contract')) return true;
    return false;
  });
  
  if (hasFundingMatch) score += 0.2;
  
  return Math.max(0, Math.min(1, score));
}

function calculateKeywordFit(
  opportunity: Opportunity,
  profile: UserProfile
): { interestFit: number; positiveBoost: number; negativePenalty: number } {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  
  // Calculate interest-based keyword fit
  const interestKeywords: { [key: string]: string[] } = {
    'healthcare': ['health', 'medical', 'wellness', 'hospital', 'clinic', 'patient', 'care', 'medicine'],
    'education': ['education', 'school', 'learning', 'student', 'teacher', 'training', 'academic', 'curriculum'],
    'environment': ['environment', 'climate', 'sustainable', 'green', 'conservation', 'energy', 'renewable'],
    'arts': ['art', 'culture', 'music', 'creative', 'design', 'performance', 'museum', 'gallery'],
    'technology': ['technology', 'software', 'digital', 'tech', 'innovation', 'data', 'ai', 'cyber'],
    'social-services': ['social', 'community', 'service', 'welfare', 'support', 'assistance', 'outreach'],
    'research': ['research', 'study', 'investigation', 'analysis', 'science', 'scholarly', 'academic'],
    'infrastructure': ['infrastructure', 'construction', 'building', 'facility', 'road', 'bridge', 'transportation'],
    'economic-development': ['economic', 'business', 'employment', 'workforce', 'entrepreneur', 'commerce', 'job'],
    'housing': ['housing', 'home', 'shelter', 'residential', 'apartment', 'affordable', 'rent'],
  };
  
  let matchCount = 0;
  let totalKeywords = 0;
  
  [...profile.interestsMain, ...profile.grantsByInterest].forEach(interest => {
    const keywords = interestKeywords[interest] || [];
    totalKeywords += keywords.length;
    keywords.forEach(kw => {
      if (oppText.includes(kw)) matchCount++;
    });
  });
  
  let interestFit = totalKeywords > 0 ? Math.min(1, matchCount / (totalKeywords * 0.3)) : 0;
  
  // Apply positive keywords (boost score)
  let positiveBoost = 0;
  let positiveMatches: string[] = [];
  if (profile.positiveKeywords && profile.positiveKeywords.length > 0) {
    profile.positiveKeywords.forEach(keyword => {
      const kw = keyword.toLowerCase().trim();
      if (kw && oppText.includes(kw)) {
        positiveBoost += 0.15; // Each positive keyword match adds 15%
        positiveMatches.push(keyword);
      }
    });
    positiveBoost = Math.min(0.3, positiveBoost); // Cap at 30% boost
    
    if (positiveMatches.length > 0) {
      console.log(`✅ Positive Keywords Matched for "${opportunity.title.substring(0, 50)}...":`, positiveMatches);
    }
  }
  
  // Apply negative keywords (penalty)
  let negativePenalty = 0;
  let negativeMatches: string[] = [];
  if (profile.negativeKeywords && profile.negativeKeywords.length > 0) {
    profile.negativeKeywords.forEach(keyword => {
      const kw = keyword.toLowerCase().trim();
      if (kw && oppText.includes(kw)) {
        negativePenalty += 0.25; // Each negative keyword match removes 25%
        negativeMatches.push(keyword);
      }
    });
    negativePenalty = Math.min(0.5, negativePenalty); // Cap at 50% penalty
    
    if (negativeMatches.length > 0) {
      console.log(`🚫 Negative Keywords Matched for "${opportunity.title.substring(0, 50)}...":`, negativeMatches);
    }
  }
  
  // Apply adjustments to interest fit
  interestFit = Math.max(0, Math.min(1, interestFit + positiveBoost - negativePenalty));
  
  return {
    interestFit,
    positiveBoost,
    negativePenalty
  };
}

function calculateStructureFit(opportunity: Opportunity, profile: UserProfile): number {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  
  // Size indicators
  const sizeKeywords = {
    small: ['small', 'startup', 'emerging', 'new'],
    medium: ['medium', 'growing', 'established'],
    large: ['large', 'major', 'enterprise', 'national'],
  };
  
  let score = 0.5; // Neutral default
  
  // For nonprofit/education, prioritize community-focused
  if (profile.entityType === 'nonprofit' || profile.entityType === 'education') {
    if (oppText.includes('community') || oppText.includes('local') || oppText.includes('grassroots')) {
      score += 0.3;
    }
  }
  
  // For for-profit, prioritize innovation/business keywords
  if (profile.entityType === 'for-profit') {
    if (oppText.includes('innovation') || oppText.includes('business') || oppText.includes('commercial')) {
      score += 0.3;
    }
  }
  
  return Math.min(1, score);
}

function calculatePopulationFit(opportunity: Opportunity, profile: UserProfile): number {
  const bp = profile.businessProfile;
  if (!bp) return 0.5; // Neutral if no business profile
  
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const profileText = `${bp.companyOverview || ''} ${bp.mission || ''} ${bp.vision || ''}`.toLowerCase();
  
  // Extract population keywords from both
  const populationKeywords = [
    'youth', 'children', 'elderly', 'veterans', 'women', 'minorities',
    'disabled', 'homeless', 'immigrants', 'rural', 'urban', 'underserved',
    'black', 'african american', 'hispanic', 'latino', 'asian', 'indigenous',
    'entrepreneurs', 'professionals', 'students', 'community'
  ];
  
  let matches = 0;
  populationKeywords.forEach(kw => {
    if (oppText.includes(kw) && profileText.includes(kw)) matches++;
  });
  
  return Math.min(1, matches * 0.15 + 0.4);
}

function calculateAmountFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!opportunity.amount) return 0.7; // Neutral if no amount specified
  
  // Convert to string if it's not already
  const amountStr = typeof opportunity.amount === 'string' 
    ? opportunity.amount.toLowerCase() 
    : String(opportunity.amount).toLowerCase();
  const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
  
  if (isNaN(amount)) return 0.7;
  
  // Score based on amount range (adjust based on your user preferences)
  if (amount < 10000) return 0.5;
  if (amount < 50000) return 0.7;
  if (amount < 100000) return 0.85;
  if (amount < 500000) return 0.9;
  return 1.0;
}

function calculateTimingFit(opportunity: Opportunity, profile: UserProfile): number {
  const deadline = opportunity.closeDate || opportunity.deadline;
  if (!deadline) return 0.5;
  
  const now = new Date();
  const closeDate = new Date(deadline);
  const daysUntil = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 0; // Past deadline
  
  const timelinePreference = profile.timeline;
  
  switch (timelinePreference) {
    case 'immediate':
      if (daysUntil <= 30) return 1.0;
      if (daysUntil <= 60) return 0.6;
      return 0.3;
    case '3-months':
      if (daysUntil <= 90) return 1.0;
      if (daysUntil <= 120) return 0.7;
      return 0.4;
    case '6-months':
      if (daysUntil <= 180) return 1.0;
      if (daysUntil <= 240) return 0.8;
      return 0.5;
    case '12-months':
      if (daysUntil <= 365) return 1.0;
      return 0.7;
    default:
      return 0.7;
  }
}

function calculateBusinessProfileFit(opportunity: Opportunity, bp: any): number {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const profileText = `
    ${bp.companyOverview || ''}
    ${bp.mission || ''}
    ${bp.vision || ''}
    ${bp.approachMethodology || ''}
  `.toLowerCase();
  
  // Extract key concepts from both texts
  const opportunityWords = extractKeyWords(oppText);
  const profileWords = extractKeyWords(profileText);
  
  // Calculate overlap
  const overlap = opportunityWords.filter(word => profileWords.includes(word));
  const overlapScore = overlap.length / Math.max(opportunityWords.length, profileWords.length);
  
  return Math.min(1, overlapScore * 2); // Boost the score
}

function calculateCapabilityFit(opportunity: Opportunity, bp: any): number {
  if (!bp.servicesCapabilities || bp.servicesCapabilities.length === 0) return 0.5;
  
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  
  let matchCount = 0;
  bp.servicesCapabilities.forEach((capability: string) => {
    const capWords = extractKeyWords(capability.toLowerCase());
    const hasMatch = capWords.some(word => oppText.includes(word));
    if (hasMatch) matchCount++;
  });
  
  return Math.min(1, (matchCount / bp.servicesCapabilities.length) * 1.5);
}

function calculateExperienceFit(opportunity: Opportunity, bp: any): number {
  const hasExperience = (bp.pastPerformance && bp.pastPerformance.length > 0) ||
                        (bp.teamExperience && bp.teamExperience.length > 0);
  
  if (!hasExperience) return 0.5;
  
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const experienceText = `
    ${(bp.pastPerformance || []).join(' ')}
    ${(bp.teamExperience || []).join(' ')}
  `.toLowerCase();
  
  const experienceWords = extractKeyWords(experienceText);
  let matchCount = 0;
  
  experienceWords.forEach(word => {
    if (oppText.includes(word)) matchCount++;
  });
  
  return Math.min(1, matchCount * 0.1 + 0.4);
}

function calculateMissionFit(opportunity: Opportunity, bp: any): number {
  if (!bp.mission && !bp.vision) return 0.5;
  
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const missionText = `${bp.mission || ''} ${bp.vision || ''}`.toLowerCase();
  
  const missionWords = extractKeyWords(missionText);
  const oppWords = extractKeyWords(oppText);
  
  const overlap = missionWords.filter(word => oppWords.includes(word));
  return Math.min(1, (overlap.length / missionWords.length) * 1.8);
}

function calculateUserPreferenceFit(opportunity: Opportunity, profile: UserProfile): number {
  const prefs = profile.preferences;
  if (!prefs) return 0.7; // Neutral default
  
  let score = 0.7;
  
  // Check if similar opportunities were saved (positive signal)
  if (prefs.savePatterns) {
    const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    
    if (prefs.savePatterns.keywords) {
      const savedKeywordMatches = prefs.savePatterns.keywords.filter(kw => 
        oppText.includes(kw.toLowerCase())
      );
      score += Math.min(0.2, savedKeywordMatches.length * 0.05);
    }
    
    if (prefs.savePatterns.agencies) {
      const agencyMatch = prefs.savePatterns.agencies.some(agency =>
        opportunity.agency.toLowerCase().includes(agency.toLowerCase())
      );
      if (agencyMatch) score += 0.1;
    }
  }
  
  // Check if similar opportunities were passed (negative signal)
  if (prefs.passPatterns) {
    const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
    
    if (prefs.passPatterns.keywords) {
      const passedKeywordMatches = prefs.passPatterns.keywords.filter(kw =>
        oppText.includes(kw.toLowerCase())
      );
      score -= Math.min(0.2, passedKeywordMatches.length * 0.05);
    }
    
    if (prefs.passPatterns.agencies) {
      const agencyMatch = prefs.passPatterns.agencies.some(agency =>
        opportunity.agency.toLowerCase().includes(agency.toLowerCase())
      );
      if (agencyMatch) score -= 0.1;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

function calculateWeightedMatchScore(
  fitComponents: FitScoreComponents,
  profile: UserProfile
): number {
  // Adaptive weights based on available data
  const hasBusinessProfile = !!profile.businessProfile;
  const hasPreferences = !!profile.preferences;
  
  let weights = {
    eligibilityFit: 0.20,
    interestKeywordFit: 0.15,
    structureFit: 0.05,
    populationFit: 0.05,
    amountFit: 0.05,
    timingFit: 0.10,
    businessProfileFit: hasBusinessProfile ? 0.15 : 0,
    capabilityFit: hasBusinessProfile ? 0.10 : 0,
    experienceFit: hasBusinessProfile ? 0.05 : 0,
    missionFit: hasBusinessProfile ? 0.05 : 0,
    userPreferenceFit: hasPreferences ? 0.05 : 0,
  };
  
  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key as keyof typeof weights] /= totalWeight;
  });
  
  // Calculate weighted score
  let score = 0;
  Object.entries(fitComponents).forEach(([key, value]) => {
    score += value * (weights[key as keyof typeof weights] || 0);
  });
  
  // Convert to 0-100 scale
  return Math.round(score * 100);
}

function generateMatchReasoning(
  opportunity: Opportunity,
  profile: UserProfile,
  fitComponents: FitScoreComponents
): MatchReasoning {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const specificReasons: string[] = [];
  const eligibilityHighlights: string[] = [];
  
  // Analyze each fit component
  if (fitComponents.eligibilityFit > 0.7) {
    eligibilityHighlights.push(`Your ${profile.entityType} entity type aligns with this opportunity`);
    strengths.push('Strong eligibility match');
  } else if (fitComponents.eligibilityFit < 0.5) {
    concerns.push('Eligibility requirements may need verification');
  }
  
  if (fitComponents.interestKeywordFit > 0.7) {
    const interests = [...profile.interestsMain, ...profile.grantsByInterest];
    strengths.push(`Aligns with your interests in ${interests.slice(0, 2).join(', ')}`);
    eligibilityHighlights.push(`Matches your focus areas: ${interests.slice(0, 3).join(', ')}`);
  }
  
  if (fitComponents.businessProfileFit > 0.7 && profile.businessProfile) {
    strengths.push('Your business profile strongly matches opportunity requirements');
    eligibilityHighlights.push('Your company overview demonstrates relevant experience');
  }
  
  if (fitComponents.capabilityFit > 0.7 && profile.businessProfile?.servicesCapabilities) {
    const caps = profile.businessProfile.servicesCapabilities.slice(0, 3).join(', ');
    strengths.push(`Your capabilities (${caps}) directly address opportunity needs`);
    specificReasons.push(`Your services in ${caps} are highly relevant`);
  }
  
  if (fitComponents.experienceFit > 0.7) {
    strengths.push('Your past performance demonstrates strong relevant experience');
    eligibilityHighlights.push('Track record aligns with opportunity requirements');
  }
  
  if (fitComponents.missionFit > 0.7 && profile.businessProfile?.mission) {
    strengths.push('Your mission strongly aligns with opportunity goals');
    specificReasons.push('Mission-driven alignment enhances competitiveness');
  }
  
  if (fitComponents.timingFit > 0.8) {
    strengths.push('Deadline aligns perfectly with your timeline preference');
  } else if (fitComponents.timingFit < 0.4) {
    concerns.push('Deadline may be too soon or too far out for your preferences');
  }
  
  if (fitComponents.userPreferenceFit > 0.8) {
    specificReasons.push('Similar to opportunities you\'ve previously saved');
  } else if (fitComponents.userPreferenceFit < 0.5) {
    concerns.push('Similar opportunities were passed on previously');
  }
  
  if (fitComponents.populationFit > 0.7) {
    eligibilityHighlights.push('Target population matches your focus demographics');
  }
  
  // Generate summary
  const matchScore = calculateWeightedMatchScore(fitComponents, profile);
  let summary = '';
  
  if (matchScore >= 80) {
    summary = `Exceptional match for ${profile.entityName}. This opportunity aligns strongly with your mission, capabilities, and experience. ${strengths.length > 0 ? strengths[0] : ''}`;
  } else if (matchScore >= 65) {
    summary = `Strong potential match. Your profile demonstrates ${strengths.length} key strengths for this opportunity. ${eligibilityHighlights.length > 0 ? eligibilityHighlights[0] : ''}`;
  } else if (matchScore >= 50) {
    summary = `Moderate fit. While there are some alignments, ${concerns.length > 0 ? concerns[0].toLowerCase() : 'careful review is recommended'}.`;
  } else {
    summary = `Lower match potential. Consider carefully whether this aligns with your strategic priorities.`;
  }
  
  const confidenceScore = Math.round(
    ((profile.businessProfile ? 30 : 10) +
    (profile.preferences ? 20 : 10) +
    (profile.keywords && profile.keywords.length > 0 ? 20 : 10) +
    (eligibilityHighlights.length * 10))
  );
  
  return {
    summary,
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 3),
    specificReasons: specificReasons.slice(0, 4),
    eligibilityHighlights: eligibilityHighlights.slice(0, 4),
    confidenceScore: Math.min(100, confidenceScore),
  };
}

function generatePersonalizedDescription(
  opportunity: Opportunity,
  profile: UserProfile,
  fitComponents: FitScoreComponents,
  reasoning: MatchReasoning
): string {
  const parts: string[] = [];
  
  // Opening - why this is relevant to them
  if (reasoning.eligibilityHighlights.length > 0) {
    parts.push(`**Why You're Eligible:** ${reasoning.eligibilityHighlights[0]}`);
  }
  
  // Specific alignment points
  if (profile.businessProfile) {
    const bp = profile.businessProfile;
    
    if (fitComponents.capabilityFit > 0.6 && bp.servicesCapabilities && bp.servicesCapabilities.length > 0) {
      const relevantCaps = bp.servicesCapabilities.slice(0, 2).join(' and ');
      parts.push(`Your expertise in ${relevantCaps} directly addresses the core requirements of this opportunity.`);
    }
    
    if (fitComponents.missionFit > 0.6 && bp.mission) {
      const missionSnippet = bp.mission.substring(0, 100);
      parts.push(`This aligns with your mission: "${missionSnippet}..."`);
    }
    
    if (fitComponents.experienceFit > 0.6 && bp.pastPerformance && bp.pastPerformance.length > 0) {
      parts.push(`Your demonstrated experience positions you as a strong candidate.`);
    }
  }
  
  // Interest alignment
  if (fitComponents.interestKeywordFit > 0.6) {
    const interests = [...profile.interestsMain, ...profile.grantsByInterest];
    if (interests.length > 0) {
      parts.push(`This opportunity falls within your focus areas: ${interests.slice(0, 3).join(', ')}.`);
    }
  }
  
  // Strategic insights
  if (reasoning.specificReasons.length > 0) {
    parts.push(`**Key Insight:** ${reasoning.specificReasons[0]}`);
  }
  
  // Timing
  const deadline = opportunity.closeDate || opportunity.deadline;
  if (deadline && fitComponents.timingFit > 0.7) {
    const closeDate = new Date(deadline);
    const daysUntil = Math.ceil((closeDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    parts.push(`Deadline is ${daysUntil} days away, which aligns with your ${profile.timeline} timeline.`);
  }
  
  // Behavioral insights
  if (fitComponents.userPreferenceFit > 0.8) {
    parts.push(`Based on your previous interests, this opportunity matches patterns from opportunities you've saved.`);
  }
  
  // Competitive angle
  if (fitComponents.experienceFit > 0.7 || fitComponents.capabilityFit > 0.8) {
    parts.push(`**Competitive Advantage:** Your profile suggests you have the qualifications to be a competitive applicant.`);
  }
  
  // Add original description at the end
  parts.push(`\n**Full Description:** ${opportunity.description}`);
  
  return parts.join('\n\n');
}

// Helper function to extract meaningful keywords
function extractKeyWords(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  return [...new Set(words)]; // Remove duplicates
}



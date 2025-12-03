import { Opportunity, UserProfile, FitScoreComponents, MatchReasoning } from '@/types';

/**
 * Enhanced Matching Algorithm
 * 
 * This algorithm provides intelligent, nuanced matching based on:
 * - Business profile analysis (from executive summary)
 * - User's historical behavior (passes/saves)
 * - Dynamic keyword extraction and matching
 * - Contextual eligibility assessment
 */

// Calculate comprehensive fit score
export function calculateEnhancedFitScore(
  opportunity: Opportunity,
  profile: UserProfile
): FitScoreComponents {
  const fitComponents: FitScoreComponents = {
    eligibilityFit: calculateEligibilityFit(opportunity, profile),
    interestKeywordFit: calculateInterestKeywordFit(opportunity, profile),
    structureFit: calculateStructureFit(opportunity, profile),
    populationFit: calculatePopulationFit(opportunity, profile),
    amountFit: calculateAmountFit(opportunity, profile),
    timingFit: calculateTimingFit(opportunity, profile),
    businessProfileFit: calculateBusinessProfileFit(opportunity, profile),
    capabilityFit: calculateCapabilityFit(opportunity, profile),
    experienceFit: calculateExperienceFit(opportunity, profile),
    missionFit: calculateMissionFit(opportunity, profile),
    userPreferenceFit: calculateUserPreferenceFit(opportunity, profile),
  };

  return fitComponents;
}

// Calculate overall match score (0-100)
export function calculateDynamicMatchScore(fitComponents: FitScoreComponents): number {
  // Dynamic weighting - more emphasis on meaningful signals
  const weights = {
    businessProfileFit: 20,
    capabilityFit: 15,
    experienceFit: 12,
    missionFit: 12,
    interestKeywordFit: 12,
    eligibilityFit: 10,
    userPreferenceFit: 10,
    structureFit: 4,
    populationFit: 2,
    amountFit: 2,
    timingFit: 1,
  };

  let score = 0;
  score += fitComponents.businessProfileFit * weights.businessProfileFit;
  score += fitComponents.capabilityFit * weights.capabilityFit;
  score += fitComponents.experienceFit * weights.experienceFit;
  score += fitComponents.missionFit * weights.missionFit;
  score += fitComponents.interestKeywordFit * weights.interestKeywordFit;
  score += fitComponents.eligibilityFit * weights.eligibilityFit;
  score += fitComponents.userPreferenceFit * weights.userPreferenceFit;
  score += fitComponents.structureFit * weights.structureFit;
  score += fitComponents.populationFit * weights.populationFit;
  score += fitComponents.amountFit * weights.amountFit;
  score += fitComponents.timingFit * weights.timingFit;

  return Math.min(Math.round(score), 100);
}

// Generate personalized match reasoning
export function generatePersonalizedReasoning(
  opportunity: Opportunity,
  profile: UserProfile,
  fitComponents: FitScoreComponents
): MatchReasoning {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const specificReasons: string[] = [];
  const eligibilityHighlights: string[] = [];

  // Business profile alignment
  if (fitComponents.businessProfileFit > 0.7) {
    strengths.push('Strong alignment with your organization\'s profile and capabilities');
    if (profile.businessProfile?.companyOverview) {
      eligibilityHighlights.push(
        `Your organization's focus aligns exceptionally well with this opportunity's requirements`
      );
    }
  } else if (fitComponents.businessProfileFit > 0.4) {
    specificReasons.push('Moderate alignment with your business profile - review requirements carefully');
  } else if (fitComponents.businessProfileFit < 0.3 && profile.businessProfile) {
    concerns.push('Limited alignment with your stated capabilities - may require partnerships');
  }

  // Capability matching
  if (fitComponents.capabilityFit > 0.7 && profile.businessProfile?.servicesCapabilities) {
    const relevantCapabilities = profile.businessProfile.servicesCapabilities
      .slice(0, 2)
      .join(', ');
    eligibilityHighlights.push(
      `Your capabilities in ${relevantCapabilities} are directly relevant to this opportunity`
    );
    strengths.push('Your services and capabilities are a strong match');
  } else if (fitComponents.capabilityFit < 0.4) {
    concerns.push('May require capabilities beyond your current service offerings');
  }

  // Experience and past performance
  if (fitComponents.experienceFit > 0.6 && profile.businessProfile?.pastPerformance) {
    strengths.push('Your past performance demonstrates relevant experience');
    eligibilityHighlights.push(
      'Your documented track record positions you competitively for this opportunity'
    );
  } else if (fitComponents.experienceFit < 0.3) {
    specificReasons.push('This opportunity may seek experience you haven\'t explicitly documented');
  }

  // Mission alignment
  if (fitComponents.missionFit > 0.7) {
    strengths.push('Excellent mission and vision alignment');
    if (profile.businessProfile?.mission) {
      eligibilityHighlights.push(
        'Your mission strongly resonates with this opportunity\'s goals'
      );
    }
  }

  // Interest and keyword matching
  if (fitComponents.interestKeywordFit > 0.7) {
    strengths.push('High relevance to your stated interests and focus areas');
    const matchedInterests = profile.interestsMain.slice(0, 2).join(' and ');
    eligibilityHighlights.push(
      `This opportunity aligns with your interests in ${matchedInterests}`
    );
  } else if (fitComponents.interestKeywordFit < 0.4) {
    concerns.push('May be outside your primary areas of interest');
  }

  // User preference learning
  if (fitComponents.userPreferenceFit > 0.7) {
    strengths.push('Similar to opportunities you\'ve previously saved');
    specificReasons.push('Matches patterns from your successful past selections');
  } else if (fitComponents.userPreferenceFit < 0.3 && profile.preferences?.passPatterns) {
    specificReasons.push('Similar to opportunities you\'ve previously passed on');
  }

  // Eligibility factors
  if (fitComponents.eligibilityFit > 0.8) {
    eligibilityHighlights.push('You meet the core eligibility requirements');
  } else if (fitComponents.eligibilityFit < 0.5) {
    concerns.push('Some eligibility requirements may not align with your profile');
  }

  // Timing considerations
  if (fitComponents.timingFit > 0.7) {
    const daysUntilDeadline = calculateDaysUntilDeadline(
      opportunity.closeDate || opportunity.deadline
    );
    if (daysUntilDeadline && daysUntilDeadline <= 30) {
      specificReasons.push(`Deadline approaching in ${daysUntilDeadline} days - high priority`);
    } else {
      specificReasons.push('Timeline aligns with your preferred schedule');
    }
  }

  // Generate summary
  const overallScore = calculateDynamicMatchScore(fitComponents);
  let summary = '';
  
  if (overallScore >= 80) {
    summary = `This is an exceptional match for ${profile.entityName}. Your organization's profile, capabilities, and experience align strongly with the opportunity's requirements. `;
    if (strengths.length > 0) {
      summary += `Key strengths include: ${strengths.slice(0, 2).join('; ')}.`;
    }
  } else if (overallScore >= 65) {
    summary = `This is a strong potential match for ${profile.entityName}. `;
    if (profile.businessProfile?.companyOverview) {
      summary += 'Your organizational profile shows good alignment, though careful review of all requirements is recommended. ';
    }
    if (strengths.length > 0) {
      summary += `Notable strengths: ${strengths[0]}.`;
    }
  } else if (overallScore >= 50) {
    summary = `This opportunity has moderate alignment with ${profile.entityName}'s profile. `;
    if (concerns.length > 0) {
      summary += `Consider the following: ${concerns[0]}.`;
    } else {
      summary += 'Review requirements carefully to assess fit.';
    }
  } else {
    summary = `This opportunity shows limited alignment with ${profile.entityName}'s current profile. `;
    if (concerns.length > 0) {
      summary += `Primary considerations: ${concerns.slice(0, 2).join('; ')}.`;
    }
    summary += ' Partnerships or capability expansion may be needed.';
  }

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(fitComponents, profile);

  return {
    summary,
    strengths,
    concerns,
    specificReasons,
    eligibilityHighlights,
    confidenceScore,
  };
}

// Generate personalized opportunity description
export function generatePersonalizedDescription(
  opportunity: Opportunity,
  profile: UserProfile,
  matchReasoning: MatchReasoning
): string {
  let description = '';

  // Start with why they're eligible
  if (matchReasoning.eligibilityHighlights.length > 0) {
    description += '**Why You\'re Eligible:** ';
    description += matchReasoning.eligibilityHighlights.join(' ') + '\n\n';
  }

  // Add key strengths
  if (matchReasoning.strengths.length > 0) {
    description += '**Your Competitive Advantages:** ';
    description += matchReasoning.strengths.join('. ') + '.\n\n';
  }

  // Add specific contextual reasons
  if (matchReasoning.specificReasons.length > 0) {
    description += '**Additional Context:** ';
    description += matchReasoning.specificReasons.join('. ') + '.\n\n';
  }

  // Add considerations if any
  if (matchReasoning.concerns.length > 0) {
    description += '**Considerations:** ';
    description += matchReasoning.concerns.join('. ') + '.\n\n';
  }

  // Add core opportunity details
  description += '**Opportunity Details:** ';
  description += opportunity.description.slice(0, 300);
  if (opportunity.description.length > 300) {
    description += '...';
  }

  return description;
}

// Individual fit calculations

function calculateEligibilityFit(opportunity: Opportunity, profile: UserProfile): number {
  let score = 0.5; // Start neutral

  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();

  // Entity type matching
  const entityKeywords: Record<string, string[]> = {
    nonprofit: ['nonprofit', 'non-profit', '501c3', 'charity', 'ngo', 'community organization'],
    'for-profit': ['business', 'company', 'corporation', 'enterprise', 'commercial', 'small business'],
    government: ['government', 'municipality', 'county', 'state agency', 'federal', 'public sector'],
    education: ['school', 'university', 'college', 'educational institution', 'academic'],
    individual: ['individual', 'person', 'artist', 'researcher', 'fellow', 'entrepreneur'],
  };

  const relevantKeywords = entityKeywords[profile.entityType] || [];
  const matchedKeywords = relevantKeywords.filter(kw => combined.includes(kw));
  
  if (matchedKeywords.length > 0) {
    score = 0.9;
  } else if (combined.includes('all entities') || combined.includes('any organization')) {
    score = 0.7;
  }

  return Math.min(score, 1);
}

function calculateInterestKeywordFit(opportunity: Opportunity, profile: UserProfile): number {
  const combined = `${opportunity.title} ${opportunity.description} ${opportunity.category || ''}`.toLowerCase();
  
  const interestKeywords: Record<string, string[]> = {
    healthcare: ['health', 'medical', 'hospital', 'wellness', 'healthcare', 'patient', 'clinical', 'medicine'],
    education: ['education', 'school', 'training', 'learning', 'student', 'academic', 'teaching', 'curriculum'],
    environment: ['environment', 'climate', 'green', 'sustainability', 'conservation', 'renewable', 'ecology', 'carbon'],
    arts: ['art', 'culture', 'museum', 'creative', 'artist', 'music', 'theater', 'performance', 'cultural'],
    technology: ['technology', 'tech', 'software', 'digital', 'IT', 'computer', 'innovation', 'cyber', 'ai', 'data'],
    'social-services': ['social service', 'community', 'welfare', 'assistance', 'support', 'outreach', 'nonprofit'],
    research: ['research', 'study', 'scientific', 'investigation', 'analysis', 'development', 'R&D', 'innovation'],
    infrastructure: ['infrastructure', 'construction', 'building', 'facility', 'transportation', 'public works', 'engineering'],
    'economic-development': ['economic', 'development', 'business', 'growth', 'employment', 'workforce', 'jobs', 'entrepreneurship'],
    housing: ['housing', 'home', 'shelter', 'residential', 'affordable housing', 'homelessness', 'real estate'],
  };

  const allInterests = [...new Set([...profile.interestsMain, ...profile.grantsByInterest])];
  let matchCount = 0;
  let totalKeywords = 0;

  allInterests.forEach(interest => {
    const keywords = interestKeywords[interest] || [];
    totalKeywords += keywords.length;
    keywords.forEach(keyword => {
      if (combined.includes(keyword)) {
        matchCount++;
      }
    });
  });

  if (totalKeywords === 0) return 0.5; // Neutral if no interests
  
  const matchRatio = matchCount / Math.min(totalKeywords, 15); // Cap at 15 to avoid dilution
  return Math.min(matchRatio * 1.5, 1); // Boost and cap at 1
}

function calculateStructureFit(opportunity: Opportunity, profile: UserProfile): number {
  // This would analyze organizational structure requirements
  // For now, return moderate score
  return 0.6;
}

function calculatePopulationFit(opportunity: Opportunity, profile: UserProfile): number {
  // Analyze if target population served matches
  return 0.6;
}

function calculateAmountFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!opportunity.amount) return 0.7; // Neutral if no amount specified

  const amountStr = opportunity.amount.toLowerCase();
  const hasLarge = amountStr.includes('million') || amountStr.includes('$1,000,000');
  const hasSmall = amountStr.includes('$50,000') || amountStr.includes('small');

  // Simple heuristic - could be enhanced with actual amount preferences
  return 0.7;
}

function calculateTimingFit(opportunity: Opportunity, profile: UserProfile): number {
  const deadline = opportunity.closeDate || opportunity.deadline;
  if (!deadline) return 0.6;

  const daysUntil = calculateDaysUntilDeadline(deadline);
  if (!daysUntil || daysUntil < 0) return 0;

  switch (profile.timeline) {
    case 'immediate':
      if (daysUntil <= 30) return 1;
      if (daysUntil <= 60) return 0.7;
      return 0.4;
    case '3-months':
      if (daysUntil <= 90) return 1;
      if (daysUntil <= 120) return 0.8;
      return 0.5;
    case '6-months':
      if (daysUntil <= 180) return 1;
      if (daysUntil <= 240) return 0.8;
      return 0.5;
    case '12-months':
      if (daysUntil <= 365) return 1;
      return 0.7;
    default:
      return 0.6;
  }
}

function calculateBusinessProfileFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!profile.businessProfile) return 0.5; // Neutral if no business profile

  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  let score = 0;
  let factors = 0;

  // Check company overview alignment
  if (profile.businessProfile.companyOverview) {
    const overviewKeywords = extractKeywords(profile.businessProfile.companyOverview);
    const matches = overviewKeywords.filter(kw => combined.includes(kw.toLowerCase()));
    score += matches.length > 0 ? 0.3 : 0.1;
    factors++;
  }

  // Check keywords
  if (profile.businessProfile.keywords && profile.businessProfile.keywords.length > 0) {
    const matches = profile.businessProfile.keywords.filter(kw => 
      combined.includes(kw.toLowerCase())
    );
    score += (matches.length / Math.min(profile.businessProfile.keywords.length, 10)) * 0.4;
    factors++;
  }

  // Check certifications relevance
  if (profile.businessProfile.certifications && profile.businessProfile.certifications.length > 0) {
    const hasRelevantCert = profile.businessProfile.certifications.some(cert =>
      combined.includes(cert.toLowerCase()) || 
      combined.includes('certified') ||
      combined.includes('certification')
    );
    score += hasRelevantCert ? 0.3 : 0.1;
    factors++;
  }

  return factors > 0 ? Math.min(score / factors * 1.5, 1) : 0.5;
}

function calculateCapabilityFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!profile.businessProfile?.servicesCapabilities || profile.businessProfile.servicesCapabilities.length === 0) {
    return 0.5; // Neutral if no capabilities listed
  }

  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  let matchScore = 0;

  profile.businessProfile.servicesCapabilities.forEach(capability => {
    const capabilityKeywords = extractKeywords(capability);
    capabilityKeywords.forEach(keyword => {
      if (combined.includes(keyword.toLowerCase())) {
        matchScore += 1;
      }
    });
  });

  const normalizedScore = matchScore / Math.max(profile.businessProfile.servicesCapabilities.length, 3);
  return Math.min(normalizedScore, 1);
}

function calculateExperienceFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!profile.businessProfile) return 0.5;

  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  let score = 0;
  let factors = 0;

  // Check past performance
  if (profile.businessProfile.pastPerformance && profile.businessProfile.pastPerformance.length > 0) {
    const relevantExperience = profile.businessProfile.pastPerformance.some(perf => {
      const perfKeywords = extractKeywords(perf);
      return perfKeywords.some(kw => combined.includes(kw.toLowerCase()));
    });
    score += relevantExperience ? 0.5 : 0.2;
    factors++;
  }

  // Check team experience
  if (profile.businessProfile.teamExperience && profile.businessProfile.teamExperience.length > 0) {
    const relevantTeam = profile.businessProfile.teamExperience.some(exp => {
      const expKeywords = extractKeywords(exp);
      return expKeywords.some(kw => combined.includes(kw.toLowerCase()));
    });
    score += relevantTeam ? 0.5 : 0.2;
    factors++;
  }

  return factors > 0 ? score / factors : 0.5;
}

function calculateMissionFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!profile.businessProfile?.mission) return 0.5;

  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const missionKeywords = extractKeywords(profile.businessProfile.mission);
  
  const matches = missionKeywords.filter(kw => combined.includes(kw.toLowerCase()));
  const fitScore = matches.length / Math.max(missionKeywords.length, 5);

  return Math.min(fitScore * 1.3, 1); // Boost mission alignment
}

function calculateUserPreferenceFit(opportunity: Opportunity, profile: UserProfile): number {
  if (!profile.preferences) return 0.6; // Neutral if no preference data

  let score = 0.6;
  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();

  // Check against save patterns (positive signal)
  if (profile.preferences.savePatterns) {
    const { keywords, agencies } = profile.preferences.savePatterns;
    
    if (keywords && keywords.length > 0) {
      const matchedKeywords = keywords.filter(kw => combined.includes(kw.toLowerCase()));
      if (matchedKeywords.length > 0) {
        score += 0.2 * (matchedKeywords.length / keywords.length);
      }
    }

    if (agencies && agencies.length > 0 && opportunity.agency) {
      const matchedAgency = agencies.some(ag => 
        opportunity.agency.toLowerCase().includes(ag.toLowerCase())
      );
      if (matchedAgency) {
        score += 0.2;
      }
    }
  }

  // Check against pass patterns (negative signal)
  if (profile.preferences.passPatterns) {
    const { keywords, agencies } = profile.preferences.passPatterns;
    
    if (keywords && keywords.length > 0) {
      const matchedKeywords = keywords.filter(kw => combined.includes(kw.toLowerCase()));
      if (matchedKeywords.length > keywords.length * 0.5) {
        score -= 0.3; // Significant overlap with passed keywords
      }
    }

    if (agencies && agencies.length > 0 && opportunity.agency) {
      const matchedAgency = agencies.some(ag => 
        opportunity.agency.toLowerCase().includes(ag.toLowerCase())
      );
      if (matchedAgency) {
        score -= 0.2;
      }
    }
  }

  return Math.max(0, Math.min(score, 1));
}

// Helper functions

function extractKeywords(text: string): string[] {
  // Extract meaningful keywords from text (remove common words)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  return [...new Set(words)]; // Remove duplicates
}

function calculateDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  
  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const days = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  } catch {
    return null;
  }
}

function calculateConfidenceScore(fitComponents: FitScoreComponents, profile: UserProfile): number {
  let confidence = 50; // Start at moderate confidence

  // Increase confidence if we have business profile
  if (profile.businessProfile) {
    confidence += 20;
    
    // More data = higher confidence
    if (profile.businessProfile.pastPerformance && profile.businessProfile.pastPerformance.length > 0) {
      confidence += 10;
    }
    if (profile.businessProfile.servicesCapabilities && profile.businessProfile.servicesCapabilities.length > 0) {
      confidence += 10;
    }
  }

  // Increase confidence if we have preference history
  if (profile.preferences?.savedOpportunityIds && profile.preferences.savedOpportunityIds.length > 5) {
    confidence += 10;
  }

  return Math.min(confidence, 100);
}

// Main matching function
export function enhancedMatchOpportunities(
  opportunities: Opportunity[],
  profile: UserProfile,
  minScore: number = 40
): Opportunity[] {
  const enrichedOpportunities = opportunities.map(opp => {
    const fitComponents = calculateEnhancedFitScore(opp, profile);
    const matchScore = calculateDynamicMatchScore(fitComponents);
    const matchReasoning = generatePersonalizedReasoning(opp, profile, fitComponents);
    const personalizedDescription = generatePersonalizedDescription(opp, profile, matchReasoning);

    return {
      ...opp,
      winRate: matchScore,
      matchScore,
      fitComponents,
      matchReasoning,
      personalizedDescription,
    };
  });

  // Filter by minimum score
  const filtered = enrichedOpportunities.filter(opp => (opp.matchScore || 0) >= minScore);

  // Sort by match score descending
  filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  return filtered;
}


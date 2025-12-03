import { Opportunity, UserProfile, FitScoreComponents, MatchReasoning, BusinessProfile } from '@/types';

/**
 * ADVANCED AI-POWERED MATCHING ALGORITHM
 * 
 * This algorithm provides intelligent, deeply nuanced matching that:
 * - Deeply analyzes business profile from executive summary
 * - Generates detailed, personalized eligibility narratives
 * - Uses adaptive scoring (not binary percentages)
 * - Learns from user behavior (passes/saves)
 * - Provides contextual, specific reasoning for each match
 */

// ============================================================================
// CORE MATCHING ENGINE
// ============================================================================

export interface DetailedFitAnalysis {
  score: number; // 0-1 continuous score
  confidence: number; // 0-1 how confident we are in this score
  evidence: string[]; // Specific evidence supporting the score
  concerns: string[]; // Specific concerns or gaps
  matchingElements: string[]; // What specifically matched
}

export interface AdvancedFitScoreComponents {
  missionAlignment: DetailedFitAnalysis;
  capabilityMatch: DetailedFitAnalysis;
  experienceRelevance: DetailedFitAnalysis;
  targetPopulationFit: DetailedFitAnalysis;
  organizationalReadiness: DetailedFitAnalysis;
  competitiveAdvantages: DetailedFitAnalysis;
  historicalPreference: DetailedFitAnalysis;
  strategicAlignment: DetailedFitAnalysis;
  fundingAmountFit: DetailedFitAnalysis;
  timelineFeasibility: DetailedFitAnalysis;
}

// ============================================================================
// DEEP SEMANTIC ANALYSIS
// ============================================================================

/**
 * Extract semantic concepts from text using advanced NLP-like analysis
 */
function extractSemanticConcepts(text: string): Map<string, number> {
  const concepts = new Map<string, number>();
  const normalized = text.toLowerCase();
  
  // Domain-specific concept patterns with weights
  const conceptPatterns: Record<string, { patterns: string[], weight: number }> = {
    'community_empowerment': {
      patterns: ['community', 'empower', 'grassroots', 'local', 'neighborhood', 'resident', 'collective'],
      weight: 1.5
    },
    'economic_development': {
      patterns: ['economic', 'employment', 'job', 'workforce', 'business', 'entrepreneur', 'commerce', 'prosperity'],
      weight: 1.3
    },
    'social_equity': {
      patterns: ['equity', 'justice', 'inclusion', 'diversity', 'marginalized', 'underserved', 'accessible'],
      weight: 1.4
    },
    'cultural_preservation': {
      patterns: ['culture', 'heritage', 'tradition', 'identity', 'cultural', 'authentic', 'preserve'],
      weight: 1.3
    },
    'innovation_technology': {
      patterns: ['innovation', 'technology', 'digital', 'platform', 'app', 'software', 'tech', 'ai', 'data'],
      weight: 1.2
    },
    'network_building': {
      patterns: ['network', 'connection', 'partnership', 'collaboration', 'ecosystem', 'alliance', 'community'],
      weight: 1.3
    },
    'capacity_building': {
      patterns: ['capacity', 'training', 'development', 'skill', 'education', 'mentorship', 'learning'],
      weight: 1.2
    },
    'service_delivery': {
      patterns: ['service', 'program', 'delivery', 'implementation', 'operation', 'provision'],
      weight: 1.0
    },
    'research_data': {
      patterns: ['research', 'data', 'analysis', 'study', 'evaluation', 'metrics', 'measurement'],
      weight: 1.1
    },
    'youth_development': {
      patterns: ['youth', 'young', 'student', 'child', 'adolescent', 'next generation'],
      weight: 1.2
    },
    'health_wellness': {
      patterns: ['health', 'wellness', 'wellbeing', 'mental health', 'physical', 'medical'],
      weight: 1.2
    },
    'arts_culture': {
      patterns: ['art', 'artist', 'creative', 'cultural', 'music', 'performance', 'exhibition'],
      weight: 1.1
    },
    'black_community': {
      patterns: ['black', 'african american', 'black-owned', 'black community', 'black professional'],
      weight: 1.6
    },
    'professional_development': {
      patterns: ['professional', 'career', 'advancement', 'leadership', 'executive', 'management'],
      weight: 1.2
    },
    'marketplace_commerce': {
      patterns: ['marketplace', 'commerce', 'transaction', 'buyer', 'seller', 'merchant', 'vendor'],
      weight: 1.1
    },
    'data_analytics': {
      patterns: ['analytics', 'insight', 'tracking', 'measurement', 'dashboard', 'reporting'],
      weight: 1.1
    }
  };

  // Score each concept based on pattern matches
  for (const [concept, { patterns, weight }] of Object.entries(conceptPatterns)) {
    let score = 0;
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\w*\\b`, 'gi');
      const matches = normalized.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > 0) {
      concepts.set(concept, score * weight);
    }
  }

  return concepts;
}

/**
 * Calculate semantic similarity between two texts
 */
function calculateSemanticSimilarity(
  text1: string,
  text2: string
): { score: number; matchedConcepts: string[]; evidence: string[] } {
  const concepts1 = extractSemanticConcepts(text1);
  const concepts2 = extractSemanticConcepts(text2);

  const matchedConcepts: string[] = [];
  const evidence: string[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Calculate overlap
  const allConcepts = new Set([...concepts1.keys(), ...concepts2.keys()]);
  
  for (const concept of allConcepts) {
    const score1 = concepts1.get(concept) || 0;
    const score2 = concepts2.get(concept) || 0;
    
    maxPossibleScore += Math.max(score1, score2);
    
    if (score1 > 0 && score2 > 0) {
      const overlapScore = Math.min(score1, score2);
      totalScore += overlapScore;
      matchedConcepts.push(concept);
      
      // Generate evidence
      const conceptName = concept.replace(/_/g, ' ');
      if (overlapScore > 2) {
        evidence.push(`Strong alignment in ${conceptName}`);
      } else if (overlapScore > 1) {
        evidence.push(`Good alignment in ${conceptName}`);
      } else {
        evidence.push(`Some alignment in ${conceptName}`);
      }
    }
  }

  const score = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

  return { score, matchedConcepts, evidence };
}

// ============================================================================
// DETAILED FIT ANALYSIS FUNCTIONS
// ============================================================================

function analyzeMissionAlignment(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  if (!profile.businessProfile?.mission) {
    return {
      score: 0.5,
      confidence: 0.3,
      evidence: ['Mission statement not provided'],
      concerns: ['Unable to assess mission alignment without your mission statement'],
      matchingElements: []
    };
  }

  const similarity = calculateSemanticSimilarity(profile.businessProfile.mission, oppText);
  
  // Analyze specific mission keywords
  const missionKeywords = extractKeywordsAdvanced(profile.businessProfile.mission);
  let keywordMatches = 0;
  const matchedKeywords: string[] = [];
  
  for (const keyword of missionKeywords) {
    if (oppText.includes(keyword.toLowerCase()) && keyword.length > 4) {
      keywordMatches++;
      matchedKeywords.push(keyword);
    }
  }

  // Build evidence
  if (similarity.score > 0.7) {
    evidence.push(`Your mission strongly aligns with this opportunity's goals`);
    evidence.push(...similarity.evidence.slice(0, 3));
  } else if (similarity.score > 0.4) {
    evidence.push(`Your mission shows moderate alignment with this opportunity`);
    evidence.push(...similarity.evidence.slice(0, 2));
  } else {
    concerns.push(`Limited mission alignment detected`);
  }

  if (matchedKeywords.length > 0) {
    matchingElements.push(`Mission keywords present: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }

  const confidence = profile.businessProfile.mission.length > 100 ? 0.9 : 0.6;

  return {
    score: Math.min(similarity.score * 1.2, 1),
    confidence,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeCapabilityMatch(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  if (!profile.businessProfile?.servicesCapabilities || 
      profile.businessProfile.servicesCapabilities.length === 0) {
    return {
      score: 0.4,
      confidence: 0.2,
      evidence: [],
      concerns: ['No capabilities documented in your profile'],
      matchingElements: []
    };
  }

  let totalScore = 0;
  const matchedCapabilities: string[] = [];

  for (const capability of profile.businessProfile.servicesCapabilities) {
    const similarity = calculateSemanticSimilarity(capability, oppText);
    
    if (similarity.score > 0.3) {
      totalScore += similarity.score;
      matchedCapabilities.push(capability);
      
      if (similarity.score > 0.6) {
        evidence.push(`Your "${capability}" capability is highly relevant`);
        matchingElements.push(capability);
      }
    }
  }

  const avgScore = totalScore / profile.businessProfile.servicesCapabilities.length;

  if (matchedCapabilities.length === 0) {
    concerns.push('None of your documented capabilities directly match this opportunity');
  } else if (matchedCapabilities.length < profile.businessProfile.servicesCapabilities.length / 2) {
    concerns.push('Only some of your capabilities apply to this opportunity');
  }

  return {
    score: Math.min(avgScore * 1.5, 1),
    confidence: 0.85,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeExperienceRelevance(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  const hasPerformance = profile.businessProfile?.pastPerformance && 
                         profile.businessProfile.pastPerformance.length > 0;
  const hasTeamExp = profile.businessProfile?.teamExperience && 
                     profile.businessProfile.teamExperience.length > 0;

  if (!hasPerformance && !hasTeamExp) {
    return {
      score: 0.4,
      confidence: 0.3,
      evidence: [],
      concerns: ['No past performance or team experience documented'],
      matchingElements: []
    };
  }

  let experienceScore = 0;
  let evidenceCount = 0;

  // Analyze past performance
  if (hasPerformance) {
    for (const perf of profile.businessProfile!.pastPerformance!) {
      const similarity = calculateSemanticSimilarity(perf, oppText);
      if (similarity.score > 0.4) {
        experienceScore += similarity.score;
        evidenceCount++;
        evidence.push(`Relevant past performance: ${perf.slice(0, 80)}${perf.length > 80 ? '...' : ''}`);
        matchingElements.push('Past Performance');
      }
    }
  }

  // Analyze team experience
  if (hasTeamExp) {
    for (const exp of profile.businessProfile!.teamExperience!) {
      const similarity = calculateSemanticSimilarity(exp, oppText);
      if (similarity.score > 0.4) {
        experienceScore += similarity.score;
        evidenceCount++;
        evidence.push(`Relevant team experience documented`);
        matchingElements.push('Team Experience');
      }
    }
  }

  const avgScore = evidenceCount > 0 ? experienceScore / evidenceCount : 0.3;

  if (evidenceCount === 0) {
    concerns.push('Your documented experience may not directly relate to this opportunity');
  }

  return {
    score: avgScore,
    confidence: 0.8,
    evidence: evidence.slice(0, 3),
    concerns,
    matchingElements: [...new Set(matchingElements)]
  };
}

function analyzeCompetitiveAdvantages(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  let advantageScore = 0;
  let advantageCount = 0;

  // Certifications
  if (profile.businessProfile?.certifications && profile.businessProfile.certifications.length > 0) {
    if (oppText.includes('certified') || oppText.includes('certification')) {
      advantageScore += 0.3;
      evidence.push(`Your certifications (${profile.businessProfile.certifications.slice(0, 2).join(', ')}) may give you a competitive edge`);
      matchingElements.push('Certifications');
      advantageCount++;
    }
  }

  // Unique approach/methodology
  if (profile.businessProfile?.approachMethodology) {
    const similarity = calculateSemanticSimilarity(profile.businessProfile.approachMethodology, oppText);
    if (similarity.score > 0.3) {
      advantageScore += 0.4;
      evidence.push(`Your documented approach aligns well with opportunity requirements`);
      matchingElements.push('Methodology');
      advantageCount++;
    }
  }

  // Outcomes/Impact
  if (profile.businessProfile?.outcomesImpact && profile.businessProfile.outcomesImpact.length > 0) {
    const hasImpactFocus = oppText.includes('outcome') || oppText.includes('impact') || 
                          oppText.includes('result') || oppText.includes('measurable');
    if (hasImpactFocus) {
      advantageScore += 0.3;
      evidence.push(`You have documented outcomes/impact that align with this opportunity's focus`);
      matchingElements.push('Demonstrated Impact');
      advantageCount++;
    }
  }

  const avgScore = advantageCount > 0 ? advantageScore / advantageCount : 0.4;

  if (advantageCount === 0) {
    concerns.push('No clear competitive advantages identified for this opportunity');
  }

  return {
    score: avgScore,
    confidence: 0.7,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeHistoricalPreference(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  if (!profile.preferences) {
    return {
      score: 0.5,
      confidence: 0.2,
      evidence: [],
      concerns: [],
      matchingElements: []
    };
  }

  let prefScore = 0.5; // Start neutral

  // Positive signals from saves
  if (profile.preferences.savePatterns?.keywords && profile.preferences.savePatterns.keywords.length > 0) {
    let savedKeywordMatches = 0;
    for (const keyword of profile.preferences.savePatterns.keywords) {
      if (oppText.includes(keyword.toLowerCase())) {
        savedKeywordMatches++;
      }
    }
    
    if (savedKeywordMatches > 2) {
      prefScore += 0.3;
      evidence.push(`This opportunity shares ${savedKeywordMatches} keywords with opportunities you've previously saved`);
      matchingElements.push('Similar to Saved Opportunities');
    } else if (savedKeywordMatches > 0) {
      prefScore += 0.1;
    }
  }

  // Check agency preference
  if (profile.preferences.savePatterns?.agencies && opportunity.agency) {
    const preferredAgency = profile.preferences.savePatterns.agencies.some(ag => 
      opportunity.agency.toLowerCase().includes(ag.toLowerCase())
    );
    if (preferredAgency) {
      prefScore += 0.15;
      evidence.push(`You've shown interest in opportunities from ${opportunity.agency}`);
      matchingElements.push('Preferred Agency');
    }
  }

  // Negative signals from passes
  if (profile.preferences.passPatterns?.keywords && profile.preferences.passPatterns.keywords.length > 0) {
    let passedKeywordMatches = 0;
    for (const keyword of profile.preferences.passPatterns.keywords) {
      if (oppText.includes(keyword.toLowerCase())) {
        passedKeywordMatches++;
      }
    }
    
    if (passedKeywordMatches > 3) {
      prefScore -= 0.2;
      concerns.push(`This opportunity is similar to ${passedKeywordMatches} opportunities you've previously passed`);
    }
  }

  const hasLearningData = (profile.preferences.savedOpportunityIds?.length || 0) > 3 ||
                          (profile.preferences.passedOpportunityIds?.length || 0) > 5;

  return {
    score: Math.max(0, Math.min(prefScore, 1)),
    confidence: hasLearningData ? 0.75 : 0.3,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeOrganizationalReadiness(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  let readinessScore = 0.5;

  // Check if they have comprehensive profile
  const hasComprehensiveProfile = !!(
    profile.businessProfile?.companyOverview &&
    profile.businessProfile?.mission &&
    profile.businessProfile?.servicesCapabilities &&
    profile.businessProfile?.servicesCapabilities.length > 0
  );

  if (hasComprehensiveProfile) {
    readinessScore += 0.2;
    evidence.push('You have a complete business profile, demonstrating organizational maturity');
    matchingElements.push('Complete Profile');
  } else {
    concerns.push('Consider completing your business profile for stronger applications');
  }

  // Check for documented systems
  if (profile.businessProfile?.approachMethodology) {
    readinessScore += 0.15;
    evidence.push('You have documented methodologies and approaches');
    matchingElements.push('Documented Processes');
  }

  // Check for proven track record
  if (profile.businessProfile?.pastPerformance && profile.businessProfile.pastPerformance.length > 2) {
    readinessScore += 0.15;
    evidence.push('You have a proven track record with multiple documented projects');
    matchingElements.push('Track Record');
  }

  return {
    score: Math.min(readinessScore, 1),
    confidence: 0.85,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeStrategicAlignment(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  let strategicScore = 0.5;

  // Check vision alignment
  if (profile.businessProfile?.vision) {
    const visionSimilarity = calculateSemanticSimilarity(profile.businessProfile.vision, oppText);
    if (visionSimilarity.score > 0.5) {
      strategicScore += 0.3;
      evidence.push('This opportunity aligns with your long-term vision');
      matchingElements.push('Vision Alignment');
    }
  }

  // Check interest alignment
  if (profile.interestsMain && profile.interestsMain.length > 0) {
    const interestKeywords: Record<string, string[]> = {
      'economic-development': ['economic', 'business', 'entrepreneur', 'jobs', 'workforce', 'commerce'],
      'social-services': ['community', 'social', 'service', 'support', 'assistance'],
      'technology': ['technology', 'digital', 'innovation', 'tech', 'platform', 'software'],
      'arts': ['art', 'culture', 'creative', 'cultural', 'artist'],
      'education': ['education', 'training', 'learning', 'mentorship', 'development'],
    };

    let matchedInterests = 0;
    for (const interest of profile.interestsMain) {
      const keywords = interestKeywords[interest] || [];
      if (keywords.some(kw => oppText.includes(kw))) {
        matchedInterests++;
      }
    }

    if (matchedInterests > 0) {
      strategicScore += 0.2 * (matchedInterests / profile.interestsMain.length);
      evidence.push(`Aligns with ${matchedInterests} of your core interest areas`);
      matchingElements.push('Interest Alignment');
    }
  }

  return {
    score: Math.min(strategicScore, 1),
    confidence: 0.75,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeTargetPopulationFit(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  // Check if opportunity mentions specific populations
  const populations = [
    { name: 'Black community', keywords: ['black', 'african american', 'black-owned', 'black community'] },
    { name: 'Underserved communities', keywords: ['underserved', 'marginalized', 'disadvantaged', 'low-income'] },
    { name: 'Youth', keywords: ['youth', 'young', 'student', 'child'] },
    { name: 'Women', keywords: ['women', 'woman-owned', 'female'] },
    { name: 'Veterans', keywords: ['veteran', 'military'] },
    { name: 'Minority', keywords: ['minority', 'diverse', 'inclusion'] }
  ];

  let populationScore = 0.5; // Neutral
  const matchedPopulations: string[] = [];

  for (const pop of populations) {
    if (pop.keywords.some(kw => oppText.includes(kw))) {
      matchedPopulations.push(pop.name);
    }
  }

  // Check against user's profile
  if (profile.businessProfile?.companyOverview) {
    const overviewLower = profile.businessProfile.companyOverview.toLowerCase();
    
    for (const matched of matchedPopulations) {
      const popKeywords = populations.find(p => p.name === matched)?.keywords || [];
      if (popKeywords.some(kw => overviewLower.includes(kw))) {
        populationScore += 0.15;
        evidence.push(`Your organization serves ${matched}, which aligns with this opportunity's focus`);
        matchingElements.push(matched);
      }
    }
  }

  if (matchedPopulations.length > 0 && evidence.length === 0) {
    concerns.push(`This opportunity focuses on ${matchedPopulations.join(', ')} - ensure alignment with your target population`);
  }

  return {
    score: Math.min(populationScore, 1),
    confidence: 0.6,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeFundingAmountFit(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  if (!opportunity.amount) {
    return {
      score: 0.6,
      confidence: 0.3,
      evidence: ['Funding amount not specified'],
      concerns: [],
      matchingElements: []
    };
  }

  // For now, provide moderate score
  // This could be enhanced with historical data about typical grant sizes user pursues
  const score = 0.7;
  evidence.push(`Funding amount: ${opportunity.amount}`);

  return {
    score,
    confidence: 0.5,
    evidence,
    concerns,
    matchingElements
  };
}

function analyzeTimelineFeasibility(
  opportunity: Opportunity,
  profile: UserProfile
): DetailedFitAnalysis {
  const evidence: string[] = [];
  const concerns: string[] = [];
  const matchingElements: string[] = [];

  const deadline = opportunity.closeDate || opportunity.deadline;
  
  if (!deadline) {
    return {
      score: 0.6,
      confidence: 0.4,
      evidence: ['No deadline specified'],
      concerns: [],
      matchingElements: []
    };
  }

  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return {
        score: 0,
        confidence: 1,
        evidence: [],
        concerns: ['Deadline has passed'],
        matchingElements: []
      };
    }

    let score = 0.5;
    
    // Match against user timeline preference
    switch (profile.timeline) {
      case 'immediate':
        if (daysUntil <= 30) {
          score = 0.95;
          evidence.push(`Deadline in ${daysUntil} days matches your immediate timeline preference`);
          matchingElements.push('Timeline Match');
        } else if (daysUntil <= 60) {
          score = 0.7;
          evidence.push(`Deadline in ${daysUntil} days is close to your immediate timeline preference`);
        } else {
          score = 0.4;
          concerns.push(`Deadline is further out than your immediate timeline preference`);
        }
        break;
      
      case '3-months':
        if (daysUntil <= 90) {
          score = 0.95;
          evidence.push(`Deadline in ${daysUntil} days aligns with your 3-month timeline`);
          matchingElements.push('Timeline Match');
        } else if (daysUntil <= 120) {
          score = 0.75;
        } else {
          score = 0.5;
        }
        break;
      
      case '6-months':
        if (daysUntil <= 180) {
          score = 0.95;
          evidence.push(`Deadline in ${daysUntil} days fits your 6-month timeline`);
          matchingElements.push('Timeline Match');
        } else {
          score = 0.7;
        }
        break;
      
      case '12-months':
        score = 0.9;
        evidence.push(`Flexible timeline accommodates this deadline`);
        matchingElements.push('Flexible Timeline');
        break;
    }

    // Urgency warning
    if (daysUntil <= 14) {
      concerns.push(`Urgent: Only ${daysUntil} days to submit - ensure you have capacity`);
    }

    return {
      score,
      confidence: 0.95,
      evidence,
      concerns,
      matchingElements
    };
  } catch {
    return {
      score: 0.5,
      confidence: 0.3,
      evidence: [],
      concerns: ['Unable to parse deadline'],
      matchingElements: []
    };
  }
}

// ============================================================================
// COMPREHENSIVE MATCH ANALYSIS
// ============================================================================

export function calculateAdvancedFitScore(
  opportunity: Opportunity,
  profile: UserProfile
): AdvancedFitScoreComponents {
  return {
    missionAlignment: analyzeMissionAlignment(opportunity, profile),
    capabilityMatch: analyzeCapabilityMatch(opportunity, profile),
    experienceRelevance: analyzeExperienceRelevance(opportunity, profile),
    targetPopulationFit: analyzeTargetPopulationFit(opportunity, profile),
    organizationalReadiness: analyzeOrganizationalReadiness(opportunity, profile),
    competitiveAdvantages: analyzeCompetitiveAdvantages(opportunity, profile),
    historicalPreference: analyzeHistoricalPreference(opportunity, profile),
    strategicAlignment: analyzeStrategicAlignment(opportunity, profile),
    fundingAmountFit: analyzeFundingAmountFit(opportunity, profile),
    timelineFeasibility: analyzeTimelineFeasibility(opportunity, profile),
  };
}

/**
 * Calculate dynamic match score with adaptive weighting
 */
export function calculateDynamicScore(components: AdvancedFitScoreComponents): number {
  // Adaptive weights based on confidence
  const weights: Record<keyof AdvancedFitScoreComponents, number> = {
    missionAlignment: 18,
    capabilityMatch: 18,
    experienceRelevance: 15,
    competitiveAdvantages: 12,
    strategicAlignment: 10,
    targetPopulationFit: 8,
    historicalPreference: 8,
    organizationalReadiness: 6,
    timelineFeasibility: 3,
    fundingAmountFit: 2,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const component = components[key as keyof AdvancedFitScoreComponents];
    // Weight by confidence
    const effectiveWeight = weight * component.confidence;
    totalScore += component.score * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 50;
  return Math.round(Math.max(0, Math.min(finalScore, 100)));
}

/**
 * Generate rich, detailed match reasoning
 */
export function generateAdvancedMatchReasoning(
  opportunity: Opportunity,
  profile: UserProfile,
  components: AdvancedFitScoreComponents
): MatchReasoning {
  const allEvidence: string[] = [];
  const allConcerns: string[] = [];
  const allMatchingElements: string[] = [];
  const eligibilityHighlights: string[] = [];

  // Collect all evidence and concerns
  const componentArray = Object.values(components);
  
  for (const comp of componentArray) {
    if (comp.score > 0.6 && comp.evidence.length > 0) {
      allEvidence.push(...comp.evidence);
    }
    if (comp.concerns.length > 0) {
      allConcerns.push(...comp.concerns);
    }
    if (comp.matchingElements.length > 0) {
      allMatchingElements.push(...comp.matchingElements);
    }
  }

  // Generate eligibility highlights (most important)
  if (components.missionAlignment.score > 0.65 && profile.businessProfile?.mission) {
    eligibilityHighlights.push(
      `Your mission to ${profile.businessProfile.mission.slice(0, 100)}... aligns exceptionally well with this opportunity's focus areas`
    );
  }

  if (components.capabilityMatch.score > 0.65 && components.capabilityMatch.matchingElements.length > 0) {
    eligibilityHighlights.push(
      `You have documented capabilities that directly address this opportunity: ${components.capabilityMatch.matchingElements.slice(0, 2).join(', ')}`
    );
  }

  if (components.experienceRelevance.score > 0.6) {
    eligibilityHighlights.push(
      `Your past performance and team experience demonstrate relevant expertise for this opportunity`
    );
  }

  if (components.competitiveAdvantages.score > 0.6 && components.competitiveAdvantages.matchingElements.length > 0) {
    eligibilityHighlights.push(
      `Competitive advantages: ${components.competitiveAdvantages.matchingElements.join(', ')}`
    );
  }

  if (components.targetPopulationFit.score > 0.65 && components.targetPopulationFit.matchingElements.length > 0) {
    eligibilityHighlights.push(
      `Your focus on serving ${components.targetPopulationFit.matchingElements.join(' and ')} aligns with this opportunity's target population`
    );
  }

  // Generate comprehensive summary
  const matchScore = calculateDynamicScore(components);
  let summary = '';

  if (matchScore >= 75) {
    summary = `This is an exceptional opportunity for ${profile.entityName}. `;
    summary += `Based on our deep analysis of your executive summary and organizational profile, you demonstrate strong alignment across multiple dimensions. `;
    if (allMatchingElements.length > 0) {
      summary += `Key matching elements include: ${[...new Set(allMatchingElements)].slice(0, 4).join(', ')}. `;
    }
    summary += `This opportunity appears to be an excellent strategic fit that leverages your core strengths.`;
  } else if (matchScore >= 60) {
    summary = `This opportunity shows strong potential for ${profile.entityName}. `;
    if (profile.businessProfile?.companyOverview) {
      summary += `Your organizational profile indicates good alignment, particularly in areas where you have documented experience and capabilities. `;
    }
    if (allEvidence.length > 0) {
      summary += `Notable strengths: ${allEvidence[0]} `;
    }
    summary += `We recommend a careful review of all requirements to confirm fit.`;
  } else if (matchScore >= 45) {
    summary = `This opportunity presents moderate alignment with ${profile.entityName}'s profile. `;
    if (allEvidence.length > 0) {
      summary += `While there are some positive indicators (${allEvidence[0]}), `;
    }
    if (allConcerns.length > 0) {
      summary += `consider the following: ${allConcerns[0]}. `;
    }
    summary += `This may require additional capability development or partnerships to be competitive.`;
  } else {
    summary = `This opportunity shows limited alignment with ${profile.entityName}'s current profile and strategic focus. `;
    if (allConcerns.length > 0) {
      summary += `Primary considerations include: ${allConcerns.slice(0, 2).join('; ')}. `;
    }
    summary += `Success would likely require significant partnerships, capability expansion, or strategic pivoting.`;
  }

  // Calculate overall confidence
  const avgConfidence = componentArray.reduce((sum, comp) => sum + comp.confidence, 0) / componentArray.length;
  const confidenceScore = Math.round(avgConfidence * 100);

  return {
    summary,
    strengths: allEvidence.slice(0, 5),
    concerns: allConcerns.slice(0, 4),
    specificReasons: allMatchingElements.slice(0, 6),
    eligibilityHighlights: eligibilityHighlights.slice(0, 4),
    confidenceScore
  };
}

/**
 * Generate deeply personalized opportunity description
 */
export function generatePersonalizedOpportunityDescription(
  opportunity: Opportunity,
  profile: UserProfile,
  matchReasoning: MatchReasoning
): string {
  let description = '';

  // Lead with eligibility (most important)
  if (matchReasoning.eligibilityHighlights.length > 0) {
    description += '### Why You\'re Eligible\n\n';
    matchReasoning.eligibilityHighlights.forEach(highlight => {
      description += `🎯 ${highlight}\n\n`;
    });
  }

  // Your competitive advantages
  if (matchReasoning.strengths.length > 0) {
    description += '### Your Competitive Advantages\n\n';
    matchReasoning.strengths.forEach(strength => {
      description += `✓ ${strength}\n\n`;
    });
  }

  // Important considerations
  if (matchReasoning.concerns.length > 0) {
    description += '### Considerations\n\n';
    matchReasoning.concerns.forEach(concern => {
      description += `⚠️ ${concern}\n\n`;
    });
  }

  // Core opportunity details
  description += '### Opportunity Overview\n\n';
  description += opportunity.description.slice(0, 400);
  if (opportunity.description.length > 400) {
    description += '...';
  }

  return description;
}

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

export function advancedMatchOpportunities(
  opportunities: Opportunity[],
  profile: UserProfile,
  minScore: number = 35
): Opportunity[] {
  console.log(`🧠 Running advanced AI-powered matching for ${opportunities.length} opportunities`);
  
  const enrichedOpportunities = opportunities.map((opp, idx) => {
    if (idx % 50 === 0) {
      console.log(`Processing opportunity ${idx + 1}/${opportunities.length}...`);
    }

    const fitComponents = calculateAdvancedFitScore(opp, profile);
    const matchScore = calculateDynamicScore(fitComponents);
    const matchReasoning = generateAdvancedMatchReasoning(opp, profile, fitComponents);
    const personalizedDescription = generatePersonalizedOpportunityDescription(opp, profile, matchReasoning);

    return {
      ...opp,
      winRate: matchScore,
      matchScore,
      fitComponents: undefined, // Clear old format
      matchReasoning,
      personalizedDescription,
    };
  });

  // Filter by minimum score
  const filtered = enrichedOpportunities.filter(opp => (opp.matchScore || 0) >= minScore);

  // Sort by match score descending
  filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  console.log(`✅ Advanced matching complete: ${filtered.length} opportunities above ${minScore}% threshold`);

  return filtered;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractKeywordsAdvanced(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'our', 'your', 'their', 'its', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'too', 'very', 'also', 'just', 'where',
    'when', 'how', 'all', 'both', 'each', 'more', 'most', 'other', 'some'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4 && !commonWords.has(word));

  // Return unique words
  return [...new Set(words)];
}


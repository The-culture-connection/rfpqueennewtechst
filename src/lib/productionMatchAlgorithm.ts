// Production-Grade Matching Algorithm
// Two-stage approach: (1) Hard eligibility gates + (2) Soft ranking score
// FAIL-CLOSED: Missing eligibility data = UNKNOWN (not eligible)

import { Opportunity, UserProfile, EntityType, FundingType, Interest, Timeline, UserSearchProfile, EligibilityGate, EligibilityEvaluation, MatchScores, MatchNotes, MatchDebug, TopMatch } from '@/types';

// Algorithm version constant
export const ALGORITHM_VERSION = '2.0.0';

// Scoring weights
const WEIGHTS = {
  eligibilityScore: 0.55, // Highest weight - eligibility is most important
  fitScore: 0.35, // Mission/keyword alignment
  effortScore: 0.10, // Application burden (lower burden = higher score)
};

// Minimum ranking score threshold
const MIN_RANKING_SCORE = 35;

// Timeline preference mapping (convert to days)
const TIMELINE_DAYS: Record<Timeline, number> = {
  'immediate': 30,
  '3-months': 90,
  '6-months': 180,
  '12-months': 365,
};

/**
 * Normalize text for matching (lowercase, remove punctuation, collapse whitespace)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Compute eligibility data quality for an opportunity
 * This helps identify opportunities with missing critical eligibility data
 */
export function computeEligibilityDataQuality(opportunity: Opportunity): {
  hasEligibleEntities: boolean;
  hasApplicantTypes: boolean;
  hasCloseDate: boolean;
  hasSufficientDescription: boolean;
  isRollingDeadline: boolean;
  qualityScore: number;
  missingFields: string[];
} {
  const hasEligibleEntities = Array.isArray(opportunity.eligibleEntities) && opportunity.eligibleEntities.length > 0;
  const hasApplicantTypes = Array.isArray(opportunity.applicantTypes) && opportunity.applicantTypes.length > 0;
  const hasCloseDate = !!(opportunity.closeDate || opportunity.deadline);
  
  // Check if description is sufficient (>= 100 chars)
  const descriptionLength = (opportunity.description || '').length;
  const hasSufficientDescription = descriptionLength >= 100;
  
  // Check if deadline is rolling (heuristic: look for "rolling", "ongoing", "open until filled" in description)
  const descText = normalizeText(opportunity.description || '');
  const isRollingDeadline = 
    descText.includes('rolling') ||
    descText.includes('ongoing') ||
    descText.includes('open until filled') ||
    descText.includes('continuous') ||
    descText.includes('no deadline');
  
  const missingFields: string[] = [];
  if (!hasEligibleEntities) missingFields.push('eligibleEntities');
  if (!hasApplicantTypes) missingFields.push('applicantTypes');
  if (!hasCloseDate && !isRollingDeadline) missingFields.push('closeDate');
  if (!hasSufficientDescription) missingFields.push('description');
  
  // Quality score: 1.0 if all fields present, decreases with each missing field
  const qualityScore = 
    (hasEligibleEntities ? 0.3 : 0) +
    (hasApplicantTypes ? 0.3 : 0) +
    (hasCloseDate || isRollingDeadline ? 0.2 : 0) +
    (hasSufficientDescription ? 0.2 : 0);
  
  return {
    hasEligibleEntities,
    hasApplicantTypes,
    hasCloseDate: hasCloseDate || isRollingDeadline,
    hasSufficientDescription,
    isRollingDeadline,
    qualityScore,
    missingFields,
  };
}

/**
 * Build user search profile from user data
 */
export function buildUserSearchProfile(profile: UserProfile): UserSearchProfile {
  const priorityKeywords = profile.positiveKeywords || [];
  const keywords = profile.keywords || [];
  // Use overview from profile or businessProfile
  const overview = profile.overview || profile.businessProfile?.companyOverview || '';
  // Use capabilities from profile or businessProfile
  const capabilities = profile.capabilities || profile.businessProfile?.servicesCapabilities || [];
  const interests = profile.interestsMain || [];
  
  // Tokenize keywords
  const allKeywords = [...priorityKeywords, ...keywords];
  const tokens = new Set<string>();
  allKeywords.forEach(kw => {
    const normalized = normalizeText(kw);
    const words = normalized.split(' ').filter(w => w.length > 2);
    words.forEach(w => tokens.add(w));
  });
  
  // Generate bigrams
  const bigrams = new Set<string>();
  allKeywords.forEach(kw => {
    const normalized = normalizeText(kw);
    const words = normalized.split(' ').filter(w => w.length > 2);
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]} ${words[i + 1]}`);
    }
  });
  
  // Keyword synonyms mapping
  const synonyms = new Map<string, string[]>([
    ['robotics', ['stem education', 'k-12', 'after-school', 'youth', 'informal stem', 'steam']],
    ['stem education', ['robotics', 'science education', 'technology education', 'math education']],
    ['k-12', ['elementary', 'middle school', 'high school', 'primary education', 'secondary education']],
    ['after-school', ['afterschool', 'out-of-school', 'extracurricular', 'youth programs']],
    ['youth', ['teen', 'adolescent', 'young people', 'students']],
    ['informal stem', ['informal education', 'stem learning', 'hands-on learning']],
  ]);
  
  return {
    priorityKeywords,
    keywords,
    overview,
    capabilities,
    interests,
    tokens: Array.from(tokens),
    bigrams: Array.from(bigrams),
    synonyms,
  };
}

/**
 * Normalize entity type strings for comparison
 */
function normalizeEntityType(entityType: EntityType): string[] {
  const mapping: Record<EntityType, string[]> = {
    'for-profit': ['for-profit', 'for profit', 'business', 'small business', 'commercial', 'company', 'corporation'],
    'nonprofit': ['nonprofit', 'non-profit', 'non profit', '501c3', 'charity', 'charitable', 'ngo'],
    'government': ['government', 'municipality', 'county', 'state', 'federal', 'public sector'],
    'education': ['education', 'school', 'university', 'college', 'academic', 'educational institution'],
    'individual': ['individual', 'individuals', 'person', 'artist', 'researcher', 'fellow'],
  };
  return mapping[entityType] || [entityType];
}

/**
 * FAIL-CLOSED eligibility evaluation
 * Returns status: "eligible" | "ineligible" | "unknown"
 * Unknown = missing critical data, treated as NOT eligible for Top Matches
 */
export function evaluateEligibility(
  opportunity: Opportunity,
  profile: UserProfile
): EligibilityEvaluation {
  const blockers: string[] = [];
  const reasons: string[] = [];
  const evidence: Array<{ field: string; value: any; source: string }> = [];
  let eligibilityScore = 1.0;
  
  // Compute data quality first
  const dataQuality = computeEligibilityDataQuality(opportunity);
  
  // Gate 1: Funding Type (HARD GATE - must match)
  const oppType = opportunity.type ? String(opportunity.type).toLowerCase() : '';
  const userFundingTypes = profile.fundingType || [];
  const fundingTypeMatch = 
    (oppType === 'grant' && userFundingTypes.includes('grants')) ||
    (oppType === 'rfp' && (userFundingTypes.includes('rfps') || userFundingTypes.includes('contracts')));
  
  evidence.push({
    field: 'type',
    value: oppType,
    source: 'api',
  });
  
  if (!fundingTypeMatch) {
    blockers.push('funding_type_mismatch');
    reasons.push(`Funding type mismatch: opportunity is ${oppType}, user interested in ${userFundingTypes.join(', ')}`);
    eligibilityScore = 0;
    return {
      status: 'ineligible',
      eligible: false,
      blockers,
      reasons,
      evidence,
      eligibilityScore: 0,
    };
  }
  reasons.push(`Funding type matches: ${oppType}`);
  
  // Gate 2: Entity Type (HARD GATE if explicit, UNKNOWN if missing)
  const userEntityTypes = normalizeEntityType(profile.entityType);
  const oppApplicantTypes = (opportunity.applicantTypes || [])
    .filter(t => t != null)
    .map(t => String(t).toLowerCase());
  const oppEligibleEntities = (opportunity.eligibleEntities || [])
    .filter(t => t != null)
    .map(t => String(t).toLowerCase());
  const allOppTypes = [...oppApplicantTypes, ...oppEligibleEntities];
  
  evidence.push({
    field: 'applicantTypes',
    value: oppApplicantTypes,
    source: 'api',
  });
  evidence.push({
    field: 'eligibleEntities',
    value: oppEligibleEntities,
    source: 'api',
  });
  
  // CRITICAL: If both arrays are empty, status = UNKNOWN
  if (allOppTypes.length === 0) {
    blockers.push('missing_applicant_types', 'missing_eligible_entities');
    reasons.push('Missing eligibility data: applicantTypes and eligibleEntities are both empty');
    eligibilityScore = 0.5; // Neutral score for unknown
    return {
      status: 'unknown',
      eligible: false,
      blockers,
      reasons,
      evidence,
      eligibilityScore,
    };
  }
  
  // Check if user's entity type matches
  let entityMatch = false;
  for (const userType of userEntityTypes) {
    if (allOppTypes.some(oppType => oppType.includes(userType) || userType.includes(oppType))) {
      entityMatch = true;
      break;
    }
  }
  
  // Check description/title for entity type mentions (weaker evidence)
  if (!entityMatch) {
    const titleStr = opportunity.title ? String(opportunity.title) : '';
    const descStr = opportunity.description ? String(opportunity.description) : '';
    const oppText = normalizeText(`${titleStr} ${descStr}`);
    for (const userType of userEntityTypes) {
      if (oppText.includes(userType)) {
        entityMatch = true;
        evidence.push({
          field: 'entityType',
          value: userType,
          source: 'description',
        });
        break;
      }
    }
  }
  
  if (!entityMatch) {
    blockers.push('entity_type_mismatch');
    reasons.push(`Entity type mismatch: user is ${profile.entityType}, opportunity requires ${allOppTypes.join(' or ')}`);
    eligibilityScore = 0;
    return {
      status: 'ineligible',
      eligible: false,
      blockers,
      reasons,
      evidence,
      eligibilityScore: 0,
    };
  }
  reasons.push(`Entity type compatible: ${profile.entityType} matches opportunity requirements`);
  
  // Gate 3: Timeline (HARD GATE if deadline passed, UNKNOWN if missing)
  const timelinePreferenceDays = profile.timelinePreferenceDays ?? TIMELINE_DAYS[profile.timeline] ?? 90;
  const deadline = opportunity.closeDate || opportunity.deadline;
  
  evidence.push({
    field: 'closeDate',
    value: deadline,
    source: deadline ? 'api' : 'missing',
  });
  
  if (deadline) {
    try {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        blockers.push('deadline_passed');
        reasons.push('Deadline has passed');
        eligibilityScore = 0;
        return {
          status: 'ineligible',
          eligible: false,
          blockers,
          reasons,
          evidence,
          eligibilityScore: 0,
        };
      } else if (daysUntil > timelinePreferenceDays * 3) {
        // Too far in future (beyond 3x preference) - treat as ineligible unless rolling
        if (!dataQuality.isRollingDeadline) {
          blockers.push('deadline_too_far');
          reasons.push(`Deadline is ${daysUntil} days away, beyond acceptable range (${timelinePreferenceDays * 3} days)`);
          eligibilityScore = 0;
          return {
            status: 'ineligible',
            eligible: false,
            blockers,
            reasons,
            evidence,
            eligibilityScore: 0,
          };
        }
      }
      reasons.push(`Deadline is ${daysUntil} days away, within acceptable range`);
    } catch (e) {
      // Invalid date - treat as unknown
      blockers.push('invalid_deadline');
      reasons.push('Could not parse deadline date');
      eligibilityScore = 0.5;
      return {
        status: 'unknown',
        eligible: false,
        blockers,
        reasons,
        evidence,
        eligibilityScore,
      };
    }
  } else {
    // No deadline - treat as UNKNOWN unless explicitly rolling
    if (!dataQuality.isRollingDeadline) {
      blockers.push('missing_close_date');
      reasons.push('No deadline specified and not marked as rolling deadline');
      eligibilityScore = 0.5;
      return {
        status: 'unknown',
        eligible: false,
        blockers,
        reasons,
        evidence,
        eligibilityScore,
      };
    } else {
      reasons.push('Rolling deadline - no specific close date required');
    }
  }
  
  // Gate 4: Program Mechanism (HARD GATE for research-heavy)
  const titleStr = opportunity.title ? String(opportunity.title) : '';
  const descStr = opportunity.description ? String(opportunity.description) : '';
  const oppText = normalizeText(`${titleStr} ${descStr}`);
  const isResearchHeavy = 
    oppText.includes('research') && 
    (oppText.includes('principal investigator') || 
     oppText.includes('dissertation') || 
     oppText.includes('academic') ||
     oppText.includes('university research') ||
     oppText.includes('nih r01') ||
     oppText.includes('nih u24') ||
     oppText.includes('nih t32') ||
     oppText.includes('nih k'));
  
  const hasResearchCapacity = 
    profile.interestsMain?.includes('research') ||
    profile.businessProfile?.servicesCapabilities?.some(c => 
      normalizeText(c).includes('research')
    );
  
  if (isResearchHeavy && !hasResearchCapacity) {
    // Check if it's SBIR/STTR (for-profit can apply)
    const isSBIR = oppText.includes('sbir') || oppText.includes('sttr') || 
                   oppText.includes('small business innovation');
    
    if (!isSBIR || profile.entityType !== 'for-profit') {
      blockers.push('research_institution_required_likely');
      reasons.push('Research-heavy mechanism (likely requires research institution) not suitable for non-research organization');
      eligibilityScore = 0;
      return {
        status: 'ineligible',
        eligible: false,
        blockers,
        reasons,
        evidence,
        eligibilityScore: 0,
      };
    }
  }
  
  // Gate 5: Geography (soft gate - not blocking)
  if (profile.geography && profile.geography.length > 0) {
    const oppLocation = normalizeText(`${opportunity.city || ''} ${opportunity.state || ''}`);
    const userLocations = profile.geography.map(g => normalizeText(g));
    const locationMatch = userLocations.some(loc => oppLocation.includes(loc) || loc.includes(oppLocation));
    
    if (!locationMatch) {
      // Soft penalty only (not a blocker)
      eligibilityScore *= 0.9;
      reasons.push(`Geography mismatch: opportunity in ${opportunity.city}, ${opportunity.state}, user focuses on ${profile.geography.join(', ')}`);
    } else {
      reasons.push(`Geography matches: ${opportunity.city}, ${opportunity.state}`);
    }
  }
  
  // If we got here, opportunity is ELIGIBLE
  return {
    status: 'eligible',
    eligible: true,
    blockers: [],
    reasons,
    evidence,
    eligibilityScore: Math.max(0, Math.min(1, eligibilityScore)),
  };
}

/**
 * Check eligibility gates (hard filters) - DEPRECATED: Use evaluateEligibility instead
 * Kept for backward compatibility
 */
export function checkEligibilityGates(
  opportunity: Opportunity,
  profile: UserProfile
): EligibilityGate {
  const reasons: string[] = [];
  let eligible = true;
  let eligibilityScore = 1.0;
  
  // Gate 1: Funding Type
  const oppType = opportunity.type ? String(opportunity.type).toLowerCase() : '';
  const userFundingTypes = profile.fundingType || [];
  const fundingTypeMatch = 
    (oppType === 'grant' && userFundingTypes.includes('grants')) ||
    (oppType === 'rfp' && (userFundingTypes.includes('rfps') || userFundingTypes.includes('contracts')));
  
  if (!fundingTypeMatch) {
    eligible = false;
    reasons.push(`Funding type mismatch: opportunity is ${oppType}, user interested in ${userFundingTypes.join(', ')}`);
    eligibilityScore *= 0;
  } else {
    reasons.push(`Funding type matches: ${oppType}`);
  }
  
  // Gate 2: Entity Type / Applicant Type Compatibility
  const userEntityTypes = normalizeEntityType(profile.entityType);
  const oppApplicantTypes = (opportunity.applicantTypes || [])
    .filter(t => t != null)
    .map(t => String(t).toLowerCase());
  const oppEligibleEntities = (opportunity.eligibleEntities || [])
    .filter(t => t != null)
    .map(t => String(t).toLowerCase());
  const allOppTypes = [...oppApplicantTypes, ...oppEligibleEntities];
  
  let entityMatch = false;
  for (const userType of userEntityTypes) {
    if (allOppTypes.some(oppType => oppType.includes(userType) || userType.includes(oppType))) {
      entityMatch = true;
      break;
    }
  }
  
  // Check description/title for entity type mentions
  if (!entityMatch) {
    const titleStr = opportunity.title ? String(opportunity.title) : '';
    const descStr = opportunity.description ? String(opportunity.description) : '';
    const oppText = normalizeText(`${titleStr} ${descStr}`);
    for (const userType of userEntityTypes) {
      if (oppText.includes(userType)) {
        entityMatch = true;
        break;
      }
    }
  }
  
  if (!entityMatch && allOppTypes.length > 0) {
    eligible = false;
    reasons.push(`Entity type mismatch: user is ${profile.entityType}, opportunity requires ${allOppTypes.join(' or ')}`);
    eligibilityScore *= 0;
  } else if (entityMatch) {
    reasons.push(`Entity type compatible: ${profile.entityType} matches opportunity requirements`);
  } else {
    // No explicit entity type requirements - assume compatible but lower confidence
    eligibilityScore *= 0.8;
    reasons.push('No explicit entity type requirements found - assuming compatible');
  }
  
  // Gate 3: Timeline Gate
  const timelinePreferenceDays = profile.timelinePreferenceDays ?? TIMELINE_DAYS[profile.timeline] ?? 90;
  const deadline = opportunity.closeDate || opportunity.deadline;
  
  if (deadline) {
    try {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        eligible = false;
        reasons.push('Deadline has passed');
        eligibilityScore *= 0;
      } else if (daysUntil > timelinePreferenceDays * 2) {
        // Too far in future (beyond 2x preference) - soft penalty unless rolling deadline
        eligibilityScore *= 0.7;
        reasons.push(`Deadline is ${daysUntil} days away, beyond preferred ${timelinePreferenceDays} days`);
      } else {
        reasons.push(`Deadline is ${daysUntil} days away, within acceptable range`);
      }
    } catch (e) {
      // Invalid date - assume compatible
      eligibilityScore *= 0.9;
      reasons.push('Could not parse deadline date');
    }
  } else {
    // No deadline - assume compatible but lower confidence
    eligibilityScore *= 0.85;
    reasons.push('No deadline specified - assuming compatible');
  }
  
  // Gate 4: Program Mechanism Heuristics
  // Downrank research-heavy mechanisms unless profile indicates research capacity
  const titleStr = opportunity.title ? String(opportunity.title) : '';
  const descStr = opportunity.description ? String(opportunity.description) : '';
  const oppText = normalizeText(`${titleStr} ${descStr}`);
  const isResearchHeavy = 
    oppText.includes('research') && 
    (oppText.includes('principal investigator') || 
     oppText.includes('dissertation') || 
     oppText.includes('academic') ||
     oppText.includes('university research'));
  
  const hasResearchCapacity = 
    profile.interestsMain?.includes('research') ||
    profile.businessProfile?.servicesCapabilities?.some(c => 
      normalizeText(c).includes('research')
    );
  
  if (isResearchHeavy && !hasResearchCapacity && profile.entityType === 'for-profit') {
    // Not SBIR/STTR - likely academic research
    const isSBIR = oppText.includes('sbir') || oppText.includes('sttr') || 
                   oppText.includes('small business innovation');
    if (!isSBIR) {
      eligible = false;
      reasons.push('Research-heavy mechanism not suitable for non-research organization');
      eligibilityScore *= 0;
    }
  }
  
  // Gate 5: Geography (if relevant data exists)
  if (profile.geography && profile.geography.length > 0) {
    const oppLocation = normalizeText(`${opportunity.city || ''} ${opportunity.state || ''}`);
    const userLocations = profile.geography.map(g => normalizeText(g));
    const locationMatch = userLocations.some(loc => oppLocation.includes(loc) || loc.includes(oppLocation));
    
    if (!locationMatch) {
      // Soft penalty for geography mismatch (not a hard gate)
      eligibilityScore *= 0.9;
      reasons.push(`Geography mismatch: opportunity in ${opportunity.city}, ${opportunity.state}, user focuses on ${profile.geography.join(', ')}`);
    } else {
      reasons.push(`Geography matches: ${opportunity.city}, ${opportunity.state}`);
    }
  }
  
  return {
    eligible,
    reasons,
    eligibilityScore: Math.max(0, Math.min(1, eligibilityScore)),
  };
}

/**
 * Compute fit score (mission/keyword alignment)
 */
export function computeFitScore(
  opportunity: Opportunity,
  searchProfile: UserSearchProfile
): number {
  const titleStr = opportunity.title ? String(opportunity.title) : '';
  const descStr = opportunity.description ? String(opportunity.description) : '';
  const normText = opportunity.normalizedText ? String(opportunity.normalizedText) : '';
  const oppText = normalizeText(`${titleStr} ${descStr} ${normText}`);
  
  let score = 0;
  let maxScore = 0;
  
  // Priority keywords (highest weight: 40%)
  maxScore += 40;
  let priorityMatches = 0;
  searchProfile.priorityKeywords.forEach(kw => {
    const normalized = normalizeText(kw);
    if (oppText.includes(normalized)) {
      priorityMatches++;
    }
  });
  if (searchProfile.priorityKeywords.length > 0) {
    score += (priorityMatches / searchProfile.priorityKeywords.length) * 40;
  }
  
  // Regular keywords (medium weight: 30%)
  maxScore += 30;
  let keywordMatches = 0;
  searchProfile.keywords.forEach(kw => {
    const normalized = normalizeText(kw);
    if (oppText.includes(normalized)) {
      keywordMatches++;
    }
  });
  if (searchProfile.keywords.length > 0) {
    score += (keywordMatches / searchProfile.keywords.length) * 30;
  }
  
  // Bigrams (20%)
  maxScore += 20;
  let bigramMatches = 0;
  searchProfile.bigrams.forEach(bigram => {
    if (oppText.includes(bigram)) {
      bigramMatches++;
    }
  });
  if (searchProfile.bigrams.length > 0) {
    score += (bigramMatches / searchProfile.bigrams.length) * 20;
  }
  
  // Overview/capabilities (10%)
  maxScore += 10;
  const overviewText = normalizeText(searchProfile.overview);
  if (overviewText && oppText.includes(overviewText.substring(0, 50))) {
    score += 10;
  } else if (searchProfile.capabilities.length > 0) {
    const capabilityMatches = searchProfile.capabilities.filter(cap => 
      oppText.includes(normalizeText(cap))
    ).length;
    if (searchProfile.capabilities.length > 0) {
      score += (capabilityMatches / searchProfile.capabilities.length) * 10;
    }
  }
  
  return Math.max(0, Math.min(1, score / maxScore));
}

/**
 * Compute effort score (application burden - lower burden = higher score)
 */
export function computeEffortScore(
  opportunity: Opportunity,
  profile: UserProfile
): number {
  let score = 1.0; // Start with full score
  
  const titleStr = opportunity.title ? String(opportunity.title) : '';
  const descStr = opportunity.description ? String(opportunity.description) : '';
  const reqText = opportunity.details?.requirementsText ? String(opportunity.details.requirementsText) : '';
  const oppText = normalizeText(`${titleStr} ${descStr} ${reqText}`);
  
  // High burden signals
  const highBurdenSignals = [
    'multi-year',
    'complex application',
    'detailed budget',
    'extensive reporting',
    'quarterly reports',
    'annual reports',
    'site visits',
    'audit requirements',
    'matching funds',
    'cost sharing',
  ];
  
  const burdenCount = highBurdenSignals.filter(signal => 
    oppText.includes(signal)
  ).length;
  
  // Penalize based on burden signals
  score -= burdenCount * 0.1;
  
  // Small org penalty (if applicable)
  if (profile.entityType === 'nonprofit' && !profile.businessProfile?.pastPerformance?.length) {
    // New/small org - higher burden
    score -= 0.2;
  }
  
  // Amount-based effort (larger amounts often have more requirements)
  if (opportunity.amount) {
    // Handle both string and number amounts
    const amountStr = typeof opportunity.amount === 'string' 
      ? opportunity.amount 
      : String(opportunity.amount);
    const amountNum = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(amountNum) && amountNum > 1000000) {
      // Large amounts = more effort
      score -= 0.1;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute all scores for an opportunity
 */
export function computeScores(
  opportunity: Opportunity,
  profile: UserProfile,
  searchProfile: UserSearchProfile
): { scores: MatchScores; debug: MatchDebug } {
  const eligibilityGate = checkEligibilityGates(opportunity, profile);
  
  // If not eligible, return zero scores
  if (!eligibilityGate.eligible) {
    return {
      scores: {
        fitScore: 0,
        effortScore: 0,
        eligibilityScore: 0,
        rankingScore: 0,
      },
      debug: {
        matchedKeywords: [],
        timeScore: 0,
        gatesTriggered: eligibilityGate.reasons,
      },
    };
  }
  
  const fitScore = computeFitScore(opportunity, searchProfile);
  const effortScore = computeEffortScore(opportunity, profile);
  const eligibilityScore = eligibilityGate.eligibilityScore;
  
  // Calculate ranking score
  const rankingScore = 100 * (
    WEIGHTS.eligibilityScore * eligibilityScore +
    WEIGHTS.fitScore * fitScore +
    WEIGHTS.effortScore * effortScore
  );
  
  // Collect matched keywords for debug
  const matchedKeywords: string[] = [];
  const allKeywords = [...searchProfile.priorityKeywords, ...searchProfile.keywords];
  const titleStr = opportunity.title ? String(opportunity.title) : '';
  const descStr = opportunity.description ? String(opportunity.description) : '';
  const oppText = normalizeText(`${titleStr} ${descStr}`);
  allKeywords.forEach(kw => {
    if (oppText.includes(normalizeText(kw))) {
      matchedKeywords.push(kw);
    }
  });
  
  // Calculate time score
  const deadline = opportunity.closeDate || opportunity.deadline;
  let timeScore = 0.5; // Default neutral
  if (deadline) {
    try {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const timelinePreferenceDays = profile.timelinePreferenceDays ?? TIMELINE_DAYS[profile.timeline] ?? 90;
      
      if (daysUntil >= 0 && daysUntil <= timelinePreferenceDays) {
        timeScore = 1.0; // Perfect match
      } else if (daysUntil > timelinePreferenceDays && daysUntil <= timelinePreferenceDays * 2) {
        timeScore = 0.7; // Acceptable
      } else {
        timeScore = 0.3; // Too far
      }
    } catch (e) {
      timeScore = 0.5;
    }
  }
  
  return {
    scores: {
      fitScore,
      effortScore,
      eligibilityScore,
      rankingScore: Math.round(rankingScore),
    },
    debug: {
      matchedKeywords,
      timeScore,
      gatesTriggered: eligibilityGate.reasons,
    },
  };
}

/**
 * Main matching function - two-stage approach
 */
export async function matchOpportunitiesProduction(
  opportunities: Opportunity[],
  profile: UserProfile,
  excludeIds: string[] = []
): Promise<{
  eligible: TopMatch[];
  unknown: TopMatch[];
  ineligible: number;
  runStats: {
    totalConsidered: number;
    eligibleCount: number;
    unknownCount: number;
    ineligibleCount: number;
    missingFieldCounts: {
      applicantTypes: number;
      eligibleEntities: number;
      closeDate: number;
      description: number;
    };
    topBlockers: Array<{ blocker: string; count: number }>;
  };
}> {
  console.log(`[Production Matching] Starting match for ${opportunities.length} opportunities`);
  
  // Build user search profile
  const searchProfile = buildUserSearchProfile(profile);
  console.log(`[Production Matching] Built search profile with ${searchProfile.priorityKeywords.length} priority keywords, ${searchProfile.keywords.length} regular keywords`);
  
  // Stage 1: Hard eligibility gates + scoring with fail-closed evaluation
  const scored: Array<{ 
    opportunity: Opportunity; 
    scores: MatchScores; 
    debug: MatchDebug; 
    eligibility: EligibilityEvaluation;
    eligibilityGate: EligibilityGate; // Keep for backward compatibility
  }> = [];
  
  for (const opp of opportunities) {
    // Skip excluded opportunities
    if (excludeIds.includes(opp.id)) {
      continue;
    }
    
    // Compute eligibility data quality and store on opportunity
    const dataQuality = computeEligibilityDataQuality(opp);
    opp.eligibilityDataQuality = dataQuality;
    
    // Compute scores (includes fail-closed eligibility evaluation)
    const { scores, debug, eligibility } = computeScores(opp, profile, searchProfile);
    
    // Keep old eligibilityGate for backward compatibility
    const eligibilityGate: EligibilityGate = {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
      eligibilityScore: eligibility.eligibilityScore,
    };
    
    scored.push({
      opportunity: opp,
      scores,
      debug,
      eligibility,
      eligibilityGate,
    });
  }
  
  console.log(`[Production Matching] Scored ${scored.length} opportunities`);
  
  // Compute run statistics (before filtering)
  const runStats = computeRunStats(scored.map(item => ({
    opportunity: item.opportunity,
    eligibility: item.eligibility,
  })));
  
  // Bucket by eligibility status
  const eligibleMatches = scored.filter(item => item.eligibility.status === 'eligible');
  const unknownMatches = scored.filter(item => item.eligibility.status === 'unknown');
  const ineligibleMatches = scored.filter(item => item.eligibility.status === 'ineligible');
  
  console.log(`[Production Matching] Eligibility breakdown: ${eligibleMatches.length} eligible, ${unknownMatches.length} unknown, ${ineligibleMatches.length} ineligible`);
  
  // Filter eligible matches by minimum ranking score
  const eligibleFiltered = eligibleMatches
    .filter(item => item.scores.rankingScore >= MIN_RANKING_SCORE)
    .sort((a, b) => b.scores.rankingScore - a.scores.rankingScore);
  
  // Filter unknown matches by minimum ranking score (for separate bucket)
  const unknownFiltered = unknownMatches
    .filter(item => item.scores.rankingScore >= MIN_RANKING_SCORE)
    .sort((a, b) => b.scores.rankingScore - a.scores.rankingScore);
  
  console.log(`[Production Matching] After filtering: ${eligibleFiltered.length} eligible, ${unknownFiltered.length} unknown (score >= ${MIN_RANKING_SCORE})`);
  
  // Convert to TopMatch format - ONLY eligible matches in main results
  const topMatches: TopMatch[] = eligibleFiltered.slice(0, 50).map(item => ({
    opportunityId: item.opportunity.id,
    eligibility: item.eligibility,
    eligibilityGate: item.eligibilityGate, // Keep for backward compatibility
    scores: item.scores,
    notes: {
      eligibilityNotes: item.eligibility.reasons,
      matchSummary: `Ranking score: ${item.scores.rankingScore}. ${item.eligibility.reasons.slice(0, 2).join('. ')}`,
    },
    confidenceScore: Math.round(
      item.eligibility.eligibilityScore * 40 +
      item.scores.fitScore * 40 + 
      item.scores.effortScore * 20
    ),
    debug: item.debug,
  }));
  
  // Convert unknown matches to TopMatch format (for separate bucket)
  const unknownTopMatches: TopMatch[] = unknownFiltered.slice(0, 50).map(item => ({
    opportunityId: item.opportunity.id,
    eligibility: item.eligibility,
    eligibilityGate: item.eligibilityGate,
    scores: item.scores,
    notes: {
      eligibilityNotes: item.eligibility.reasons,
      matchSummary: `Ranking score: ${item.scores.rankingScore}. ${item.eligibility.reasons.slice(0, 2).join('. ')}`,
    },
    confidenceScore: Math.round(
      item.eligibility.eligibilityScore * 40 +
      item.scores.fitScore * 40 + 
      item.scores.effortScore * 20
    ),
    debug: item.debug,
  }));
  
  console.log(`[Production Matching] Returning ${topMatches.length} eligible matches, ${unknownTopMatches.length} unknown eligibility matches`);
  
  return {
    eligible: topMatches,
    unknown: unknownTopMatches,
    ineligible: ineligibleMatches.length,
    runStats,
  };
}

/**
 * Compute run statistics for auditability
 * Exported for use in run-matching route
 */
export function computeRunStats(
  allScored: Array<{ opportunity: Opportunity; eligibility: EligibilityEvaluation }>
): {
  totalConsidered: number;
  eligibleCount: number;
  unknownCount: number;
  ineligibleCount: number;
  missingFieldCounts: {
    applicantTypes: number;
    eligibleEntities: number;
    closeDate: number;
    description: number;
  };
  topBlockers: Array<{ blocker: string; count: number }>;
} {
  const stats = {
    totalConsidered: allScored.length,
    eligibleCount: 0,
    unknownCount: 0,
    ineligibleCount: 0,
    missingFieldCounts: {
      applicantTypes: 0,
      eligibleEntities: 0,
      closeDate: 0,
      description: 0,
    },
    topBlockers: [] as Array<{ blocker: string; count: number }>,
  };
  
  const blockerCounts = new Map<string, number>();
  
  for (const item of allScored) {
    // Count by status
    if (item.eligibility.status === 'eligible') {
      stats.eligibleCount++;
    } else if (item.eligibility.status === 'unknown') {
      stats.unknownCount++;
    } else {
      stats.ineligibleCount++;
    }
    
    // Count missing fields
    const dataQuality = item.opportunity.eligibilityDataQuality || computeEligibilityDataQuality(item.opportunity);
    if (!dataQuality.hasApplicantTypes) stats.missingFieldCounts.applicantTypes++;
    if (!dataQuality.hasEligibleEntities) stats.missingFieldCounts.eligibleEntities++;
    if (!dataQuality.hasCloseDate) stats.missingFieldCounts.closeDate++;
    if (!dataQuality.hasSufficientDescription) stats.missingFieldCounts.description++;
    
    // Count blockers
    for (const blocker of item.eligibility.blockers) {
      blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
    }
  }
  
  // Get top 10 blockers
  stats.topBlockers = Array.from(blockerCounts.entries())
    .map(([blocker, count]) => ({ blocker, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}

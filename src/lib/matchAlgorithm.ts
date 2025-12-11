import { Opportunity, UserProfile, FundingType, Interest, Timeline, EntityType } from '@/types';

/**
 * Get default negative keywords based on entity type.
 * These are automatically applied if user hasn't set their own negative keywords.
 */
export function getDefaultNegativeKeywords(entityType: EntityType): string[] {
  if (entityType === 'for-profit') {
    return [
      'postdoctoral fellowship',
      'undergraduate',
      'graduate student',
      'dissertation',
      'k-12',
      'k12',
      'elementary school',
      'high school',
      'tenure-track',
      'principal investigator', // Unless it's SBIR/STTR, but we handle that in pre-filter
      'nonprofit only',
      'non-profits only',
      'state governments only',
      'county governments only',
      'tribal organizations only',
      'individuals only',
      'students only',
      'faculty only',
      'artists only',
    ];
  }
  
  // Add defaults for other entity types if needed
  if (entityType === 'nonprofit') {
    return [
      'for-profit only',
      'business only',
      'commercial only',
      'small business only',
    ];
  }
  
  return [];
}

/**
 * Pre-filter opportunities based on hard eligibility criteria before scoring.
 * This aggressively filters out ineligible opportunities for for-profit startups.
 * Also filters by negative keywords (hard stop if any negative keyword in title).
 */
export function preFilterForEntityType(
  opportunity: Opportunity, 
  entityType: EntityType,
  negativeKeywords?: string[]
): boolean {
  const title = opportunity.title?.substring(0, 50) || 'NO TITLE';
  
  // HARD FILTER: Check negative keywords in title FIRST (before any other checks)
  if (negativeKeywords && negativeKeywords.length > 0) {
    const titleLower = (opportunity.title || '').toLowerCase();
    for (const negKeyword of negativeKeywords) {
      const negLower = negKeyword.toLowerCase().trim();
      if (negLower.length > 0 && titleLower.includes(negLower)) {
        console.log('[preFilterForEntityType] ❌ HARD FILTER - Negative keyword in title:', {
          title: opportunity.title?.substring(0, 50),
          negativeKeyword: negKeyword,
        });
        return false; // Hard stop - never include this opportunity
      }
    }
  }
  // 1. Check structured eligibility fields first (most reliable)
  if (opportunity.applicantTypes && opportunity.applicantTypes.length > 0) {
    const applicantTypesLower = opportunity.applicantTypes.map(t => t.toLowerCase());
    
    // For for-profit startups, exclude opportunities targeted to:
    if (entityType === 'for-profit') {
      const excludedTypes = [
        'individual',
        'individuals',
        'student',
        'students',
        'postdoc',
        'postdocs',
        'postdoctoral',
        'faculty',
        'artist',
        'artists',
        'nonprofit',
        'non-profits',
        'nonprofit only',
        'non-profits only',
        'state governments only',
        'county governments only',
        'local governments only',
        'tribal organizations only',
        'tribal organizations',
        'educational institutions only',
        'universities only',
      ];
      
      // If any excluded type is in the applicant types, filter out
      const excludedMatches = applicantTypesLower.filter(t => excludedTypes.some(ex => t.includes(ex)));
      if (excludedMatches.length > 0) {
        console.log('[preFilterForEntityType] ❌ FILTERED - Excluded applicant types:', {
          title,
          entityType,
          excludedMatches,
          applicantTypes: opportunity.applicantTypes,
        });
        return false;
      }
      
      // If it explicitly says "for-profit" or "small business", allow it
      const allowedTypes = ['for-profit', 'for profit', 'small business', 'business', 'commercial'];
      if (!applicantTypesLower.some(t => allowedTypes.some(allowed => t.includes(allowed)))) {
        // If no allowed types and we have explicit applicant types, be cautious
        // But don't filter out if applicantTypes might be incomplete
      }
    }
    
    // For nonprofits, exclude for-profit only opportunities
    if (entityType === 'nonprofit') {
      if (applicantTypesLower.some(t => 
        ['for-profit only', 'for profit only', 'business only', 'commercial only'].some(ex => t.includes(ex))
      )) {
        return false;
      }
    }
  }
  
  // 2. Filter by funding activity categories (for for-profit startups)
  if (entityType === 'for-profit' && opportunity.fundingActivityCategories && opportunity.fundingActivityCategories.length > 0) {
    const categoriesLower = opportunity.fundingActivityCategories.map(c => c.toLowerCase());
    
    // Exclude pure academic/research categories that aren't business-focused
    const excludedCategories = [
      'education', // Too broad, but K-12 and higher ed grants are usually not for startups
      'health', // Unless it's SBIR/STTR or commercial health tech
      'humanities',
      'social science research',
      'basic research', // Unless SBIR/STTR
      'fellowships',
      'postdoctoral',
      'dissertation',
      'undergraduate',
      'graduate',
      'faculty',
    ];
    
    // Check if ALL categories are excluded (if so, filter out)
    // But allow if it's SBIR/STTR or commercial-focused
    const hasSBIR = categoriesLower.some(c => 
      c.includes('sbir') || c.includes('sttr') || c.includes('small business innovation')
    );
    const hasCommercial = categoriesLower.some(c =>
      c.includes('commercial') || c.includes('business') || c.includes('innovation') || c.includes('technology transfer')
    );
    
    if (!hasSBIR && !hasCommercial) {
      // If all categories are in the excluded list, filter out
      const allExcluded = categoriesLower.every(c => 
        excludedCategories.some(ex => c.includes(ex))
      );
      if (allExcluded) {
        console.log('[preFilterForEntityType] ❌ FILTERED - All categories excluded:', {
          title,
          entityType,
          categories: opportunity.fundingActivityCategories,
        });
        return false;
      }
    }
  }
  
  // 3. Check eligibleEntities field
  if (opportunity.eligibleEntities && opportunity.eligibleEntities.length > 0) {
    const eligibleLower = opportunity.eligibleEntities.map(e => e.toLowerCase());
    
    if (entityType === 'for-profit') {
      const excludedEntities = [
        'individuals',
        'students',
        'postdocs',
        'faculty',
        'artists',
        'nonprofits only',
        'state governments only',
        'county governments only',
        'tribal organizations only',
      ];
      
      const excludedEntityMatches = eligibleLower.filter(e => excludedEntities.some(ex => e.includes(ex)));
      if (excludedEntityMatches.length > 0) {
        console.log('[preFilterForEntityType] ❌ FILTERED - Excluded eligible entities:', {
          title,
          entityType,
          excludedEntityMatches,
          eligibleEntities: opportunity.eligibleEntities,
        });
        return false;
      }
    }
  }
  
  // 4. Fallback: Check description/title for hard exclusion keywords (for for-profit)
  if (entityType === 'for-profit') {
    const desc = (opportunity.description || '').toLowerCase();
    const title = (opportunity.title || '').toLowerCase();
    const combined = `${title} ${desc}`;
    
    // Hard exclusion patterns that indicate this is NOT for a startup
    const hardExclusions = [
      'postdoctoral fellowship',
      'undergraduate research',
      'graduate student',
      'dissertation research',
      'faculty only',
      'tenure-track',
      'principal investigator', // Unless it's SBIR/STTR
      'k-12',
      'k12',
      'elementary school',
      'high school',
      'nonprofit only',
      'non-profits only',
      'state governments only',
      'county governments only',
    ];
    
    // Allow if it's SBIR/STTR (these use "principal investigator" but are for businesses)
    const isSBIR = combined.includes('sbir') || combined.includes('sttr') || 
                   combined.includes('small business innovation');
    
    if (!isSBIR) {
      for (const exclusion of hardExclusions) {
        if (combined.includes(exclusion)) {
          console.log('[preFilterForEntityType] ❌ FILTERED - Hard exclusion keyword found:', {
            title,
            entityType,
            exclusion,
          });
          return false;
        }
      }
    }
  }
  
  // Log successful pass
  console.log('[preFilterForEntityType] ✅ PASSED:', {
    title,
    entityType,
  });
  
  return true; // Passes all filters
}

// Calculate win rate for an opportunity based on user profile
export function calculateWinRate(opportunity: Opportunity, profile: UserProfile): number {
  let score = 0;
  let maxScore = 0;

  // 1. Interest/Category Match (40 points) - HIGHEST WEIGHT
  maxScore += 40;
  const interestScore = matchesInterests(opportunity, profile.interestsMain, profile.grantsByInterest, profile.entityType);
  score += interestScore;

  // 2. Funding Type Match (25 points)
  maxScore += 25;
  if (matchesFundingType(opportunity, profile.fundingType)) {
    score += 25;
  }

  // 3. Keywords Match (20 points)
  maxScore += 20;
  // Use user's negative keywords, or default ones based on entity type
  const negativeKeywords = profile.negativeKeywords && profile.negativeKeywords.length > 0
    ? profile.negativeKeywords
    : getDefaultNegativeKeywords(profile.entityType);
  const keywordsScore = matchesKeywords(
    opportunity, 
    profile.keywords || [],
    negativeKeywords,
    profile.preferences?.passPatterns
  );
  score += keywordsScore;

  // 4. Entity Type Match (10 points)
  maxScore += 10;
  if (matchesEntityType(opportunity, profile.entityType)) {
    score += 10;
  }

  // 5. Timeline Match (5 points)
  maxScore += 5;
  const timelineScore = matchesTimeline(opportunity, profile.timeline);
  score += timelineScore;

  // Calculate percentage
  const winRate = Math.round((score / maxScore) * 100);
  return winRate;
}

// Check if opportunity matches funding type
function matchesFundingType(opportunity: Opportunity, fundingTypes: FundingType[]): boolean {
  // RFP opportunities
  const isRFP = opportunity.type === 'RFP';
  const matchesRFP = isRFP && (fundingTypes.includes('contracts') || fundingTypes.includes('rfps'));
  
  // Grant opportunities
  const isGrant = opportunity.type === 'Grant';
  const matchesGrant = isGrant && fundingTypes.includes('grants');
  
  const result = matchesRFP || matchesGrant;
  
  console.log('[matchesFundingType]', {
    opportunityTitle: opportunity.title?.substring(0, 50),
    opportunityType: opportunity.type,
    userFundingTypes: fundingTypes,
    isRFP,
    isGrant,
    matchesRFP,
    matchesGrant,
    result,
    score: result ? 25 : 0,
  });
  
  return result;
}

// Check if opportunity matches entity type
// NOTE: This is now used as a secondary boost, not the main eligibility gate.
// Main eligibility filtering happens in preFilterForEntityType().
function matchesEntityType(opportunity: Opportunity, entityType: EntityType): boolean {
  const entityMap: Record<EntityType, string[]> = {
    'nonprofit': ['nonprofit', 'non-profit', '501c3', 'charity', 'charitable', 'ngo'],
    'for-profit': ['for-profit', 'for profit', 'business', 'company', 'corporation', 'enterprise', 'commercial', 'small business'],
    'government': ['government', 'municipality', 'county', 'state', 'federal', 'public sector', 'state governments', 'local governments'],
    'education': ['education', 'school', 'university', 'college', 'academic', 'educational', 'educational institutions'],
    'individual': ['individual', 'individuals', 'person', 'artist', 'researcher', 'fellow'],
  };
  
  const keywords = entityMap[entityType] || [];
  let matchedViaStructured = false;
  let matchedViaText = false;
  const hits: string[] = [];
  
  // First check structured fields (most reliable)
  if (opportunity.applicantTypes && opportunity.applicantTypes.length > 0) {
    const applicantTypesLower = opportunity.applicantTypes.map(t => t.toLowerCase());
    
    // Check if any applicant type matches our entity type keywords
    for (const keyword of keywords) {
      const matchingTypes = applicantTypesLower.filter(t => t.includes(keyword));
      if (matchingTypes.length > 0) {
        matchedViaStructured = true;
        hits.push(...matchingTypes);
        break;
      }
    }
  }
  
  // Fallback to text search in description/title
  if (!matchedViaStructured) {
    const desc = (opportunity.description || '').toLowerCase();
    const title = (opportunity.title || '').toLowerCase();
    const combined = `${title} ${desc}`;
    
    // If any keyword matches, give full score
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        matchedViaText = true;
        hits.push(keyword);
        break;
      }
    }
  }
  
  const result = matchedViaStructured || matchedViaText;
  
  console.log('[matchesEntityType]', {
    opportunityTitle: opportunity.title?.substring(0, 50),
    entityType,
    applicantTypes: opportunity.applicantTypes,
    keywords,
    matchedViaStructured,
    matchedViaText,
    hits,
    result,
    score: result ? 10 : 0,
  });
  
  return result;
}

// Calculate interest match score (0-40 points) - HIGHEST WEIGHT
// Improved to distinguish academic research vs commercial startup interests
function matchesInterests(
  opportunity: Opportunity, 
  mainInterests: Interest[], 
  grantsByInterest: Interest[],
  entityType?: EntityType
): number {
  const allInterests = [...new Set([...mainInterests, ...grantsByInterest])];
  
  if (allInterests.length === 0) return 0;
  
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  const category = (opportunity.category || '').toLowerCase();
  const combined = `${title} ${desc} ${category}`;
  
  // Check if this is SBIR/STTR (these are commercial even if they mention research)
  const isSBIR = combined.includes('sbir') || combined.includes('sttr') || 
                  combined.includes('small business innovation') ||
                  opportunity.fundingActivityCategories?.some(c => 
                    c.toLowerCase().includes('sbir') || c.toLowerCase().includes('sttr')
                  );
  
  // Interest keyword mapping - split into commercial vs academic for better matching
  const interestKeywords: Record<Interest, { commercial: string[]; academic?: string[] }> = {
    healthcare: {
      commercial: ['digital health', 'telehealth', 'ehr', 'health tech', 'healthcare software', 'health saas', 'medical device', 'healthcare innovation', 'healthcare technology'],
      academic: ['clinical trial', 'principal investigator', 'academic institution', 'medical research', 'biomedical research', 'clinical research'],
    },
    education: {
      commercial: ['edtech', 'education technology', 'learning platform', 'educational software', 'online learning', 'education innovation'],
      academic: ['k-12', 'k12', 'elementary', 'high school', 'university', 'college', 'academic', 'student', 'teacher training', 'curriculum'],
    },
    environment: {
      commercial: ['clean tech', 'renewable energy', 'sustainability tech', 'green technology', 'environmental innovation', 'carbon capture'],
      academic: ['climate research', 'environmental research', 'conservation research', 'ecology study'],
    },
    arts: {
      commercial: ['creative technology', 'digital art', 'art tech', 'cultural innovation'],
      academic: ['art history', 'cultural studies', 'museum research', 'artistic research'],
    },
    technology: {
      commercial: ['software', 'saas', 'platform', 'app', 'digital', 'tech startup', 'innovation', 'cybersecurity', 'ai', 'machine learning', 'blockchain'],
      academic: ['computer science research', 'academic research', 'university research'],
    },
    'social-services': {
      commercial: ['social innovation', 'community tech', 'social enterprise'],
      academic: ['social research', 'community research', 'welfare research'],
    },
    research: {
      // For "research" interest, we need to be very careful
      // Only match if it's clearly commercial R&D (SBIR/STTR) or product development
      commercial: ['product development', 'r&d', 'innovation', 'commercialization', 'technology transfer', 'sbir', 'sttr'],
      academic: ['basic research', 'fundamental research', 'scientific research', 'academic research', 'university research', 'dissertation', 'postdoctoral'],
    },
    infrastructure: {
      commercial: ['infrastructure tech', 'smart city', 'construction tech', 'infrastructure innovation'],
      academic: ['infrastructure research', 'urban planning research'],
    },
    'economic-development': {
      commercial: ['business development', 'startup', 'entrepreneurship', 'economic growth', 'job creation', 'workforce development', 'business innovation'],
      academic: ['economic research', 'economic study', 'labor research'],
    },
    housing: {
      commercial: ['housing tech', 'proptech', 'real estate tech', 'affordable housing innovation'],
      academic: ['housing research', 'urban studies', 'housing policy research'],
    },
  };
  
  let matchedInterests = 0;
  const matchedDetails: { interest: Interest; keyword: string; type: 'commercial' | 'academic' }[] = [];
  const skippedInterests: { interest: Interest; reason: string }[] = [];
  
  for (const interest of allInterests) {
    const keywordSets = interestKeywords[interest];
    if (!keywordSets) continue;
    
    let interestMatched = false;
    
    // For for-profit entities, prioritize commercial keywords
    if (entityType === 'for-profit' && !isSBIR) {
      // Check commercial keywords first
      for (const keyword of keywordSets.commercial) {
        if (combined.includes(keyword)) {
          matchedInterests++;
          interestMatched = true;
          matchedDetails.push({ interest, keyword, type: 'commercial' });
          break;
        }
      }
      
      // Only check academic keywords if commercial didn't match AND it's not clearly academic
      if (!interestMatched && keywordSets.academic) {
        // For for-profit, be more strict - only match academic if it's clearly relevant
        // (e.g., SBIR/STTR programs that mention research but are for businesses)
        const hasAcademicOnly = keywordSets.academic.some(k => combined.includes(k));
        const hasCommercialIndicators = combined.includes('commercial') || 
                                        combined.includes('business') ||
                                        combined.includes('startup') ||
                                        combined.includes('innovation');
        
        // Don't match pure academic research for for-profit unless there are commercial indicators
        if (hasAcademicOnly && !hasCommercialIndicators) {
          // Skip this interest match for for-profit
          skippedInterests.push({ interest, reason: 'Academic-only keywords without commercial indicators' });
          continue;
        }
      }
    } else {
      // For other entity types or SBIR/STTR, check both commercial and academic
      for (const keyword of keywordSets.commercial) {
        if (combined.includes(keyword)) {
          matchedInterests++;
          interestMatched = true;
          matchedDetails.push({ interest, keyword, type: 'commercial' });
          break;
        }
      }
      
      if (!interestMatched && keywordSets.academic) {
        for (const keyword of keywordSets.academic) {
          if (combined.includes(keyword)) {
            matchedInterests++;
            matchedDetails.push({ interest, keyword, type: 'academic' });
            break;
          }
        }
      }
    }
  }
  
  // Score proportional to matched interests - full 40 points if all interests match
  const matchRatio = matchedInterests / allInterests.length;
  const score = Math.round(matchRatio * 40);
  
  console.log('[matchesInterests]', {
    opportunityTitle: opportunity.title?.substring(0, 50),
    allInterests,
    entityType,
    isSBIR,
    matchedInterests,
    totalInterests: allInterests.length,
    matchedDetails,
    skippedInterests,
    matchRatio: matchRatio.toFixed(2),
    score,
  });
  
  return score;
}

// Calculate keywords match score (0-20 points)
// Now includes negative keyword filtering and pass pattern awareness
function matchesKeywords(
  opportunity: Opportunity, 
  keywords: string[], 
  negativeKeywords?: string[],
  passPatterns?: { keywords?: string[]; agencies?: string[]; amounts?: string[] }
): number {
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  const category = (opportunity.category || '').toLowerCase();
  const agency = (opportunity.agency || '').toLowerCase();
  const combined = `${title} ${desc} ${category} ${agency}`;
  
  // HARD EXCLUSION: Check negative keywords first
  const negativeHits: string[] = [];
  if (negativeKeywords && negativeKeywords.length > 0) {
    for (const negKeyword of negativeKeywords) {
      const negLower = negKeyword.toLowerCase().trim();
      if (negLower.length > 0 && combined.includes(negLower)) {
        negativeHits.push(negKeyword);
      }
    }
    if (negativeHits.length > 0) {
      console.log('[matchesKeywords] ❌ HARD EXCLUSION - Negative keywords matched:', {
        opportunityTitle: opportunity.title?.substring(0, 50),
        negativeHits,
        score: 0,
      });
      return 0; // Hard exclusion - return 0 points
    }
  }
  
  // HARD EXCLUSION: Check pass patterns (learned from user behavior)
  const passPatternHits: { type: string; pattern: string }[] = [];
  if (passPatterns) {
    // Check keyword patterns
    if (passPatterns.keywords && passPatterns.keywords.length > 0) {
      for (const pattern of passPatterns.keywords) {
        const patternLower = pattern.toLowerCase().trim();
        if (patternLower.length > 0 && combined.includes(patternLower)) {
          passPatternHits.push({ type: 'keyword', pattern });
        }
      }
    }
    
    // Check agency patterns
    if (passPatterns.agencies && passPatterns.agencies.length > 0) {
      for (const agencyPattern of passPatterns.agencies) {
        if (agency.toLowerCase().includes(agencyPattern.toLowerCase())) {
          passPatternHits.push({ type: 'agency', pattern: agencyPattern });
        }
      }
    }
    
    if (passPatternHits.length > 0) {
      console.log('[matchesKeywords] ❌ HARD EXCLUSION - Pass patterns matched:', {
        opportunityTitle: opportunity.title?.substring(0, 50),
        passPatternHits,
        score: 0,
      });
      return 0; // User consistently passes on opportunities with this pattern
    }
  }
  
  // If no keywords provided, return neutral score
  if (keywords.length === 0) {
    console.log('[matchesKeywords] No keywords set → neutral 10', {
      opportunityTitle: opportunity.title?.substring(0, 50),
    });
    return 10;
  }
  
  // Positive keyword matching
  let matchedKeywords = 0;
  const matchedList: string[] = [];
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase().trim();
    if (keywordLower.length > 0 && combined.includes(keywordLower)) {
      matchedKeywords++;
      matchedList.push(keyword);
    }
  }
  
  // Score proportional to matched keywords (up to 20 points)
  // If 50%+ keywords match, give full score
  const matchRatio = matchedKeywords / keywords.length;
  let score = 0;
  if (matchRatio >= 0.5) score = 20;
  else if (matchRatio >= 0.3) score = 15;
  else if (matchRatio >= 0.1) score = 8;
  
  console.log('[matchesKeywords]', {
    opportunityTitle: opportunity.title?.substring(0, 50),
    keywords,
    negativeKeywords: negativeKeywords?.length || 0,
    matchedKeywords,
    totalKeywords: keywords.length,
    matchedList,
    matchRatio: matchRatio.toFixed(2),
    score,
  });
  
  return score;
}

// Calculate timeline match score (0-5 points)
function matchesTimeline(opportunity: Opportunity, timeline: Timeline): number {
  const deadline = opportunity.closeDate || opportunity.deadline;
  if (!deadline) {
    console.log('[matchesTimeline] No deadline → neutral 2', {
      opportunityTitle: opportunity.title?.substring(0, 50),
      timeline,
    });
    return 2; // Give neutral score if no deadline
  }
  
  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // If deadline has passed, return 0
    if (daysUntil < 0) {
      console.log('[matchesTimeline] Deadline passed → 0', {
        opportunityTitle: opportunity.title?.substring(0, 50),
        deadline,
        daysUntil,
      });
      return 0;
    }
    
    let score = 0;
    
    // Match based on user's timeline preference
    switch (timeline) {
      case 'immediate':
        // 0-30 days: full score, 31-60 days: partial score
        if (daysUntil <= 30) score = 5;
        else if (daysUntil <= 60) score = 3;
        else score = 1;
        break;
        
      case '3-months':
        // 0-90 days: full score
        if (daysUntil <= 90) score = 5;
        else if (daysUntil <= 120) score = 3;
        else score = 1;
        break;
        
      case '6-months':
        // 0-180 days: full score
        if (daysUntil <= 180) score = 5;
        else if (daysUntil <= 240) score = 3;
        else score = 1;
        break;
        
      case '12-months':
        // 0-365 days: full score
        if (daysUntil <= 365) score = 5;
        else score = 3;
        break;
        
      default:
        score = 2;
    }
    
    console.log('[matchesTimeline]', {
      opportunityTitle: opportunity.title?.substring(0, 50),
      timeline,
      deadline,
      daysUntil,
      score,
    });
    
    return score;
  } catch (e: any) {
    console.log('[matchesTimeline] Error parsing date → neutral 2', {
      opportunityTitle: opportunity.title?.substring(0, 50),
      deadline,
      error: e?.message,
    });
    return 2; // Neutral score if date parsing fails
  }
}

// Match and score all opportunities, return sorted by win rate
export function matchOpportunities(
  opportunities: Opportunity[], 
  profile: UserProfile,
  minWinRate: number = 0,
  excludeIds?: string[] // IDs of opportunities to exclude (passed/saved)
): Opportunity[] {
  // Get negative keywords for hard filtering
  const negativeKeywords = profile.negativeKeywords && profile.negativeKeywords.length > 0
    ? profile.negativeKeywords
    : getDefaultNegativeKeywords(profile.entityType);
  
  // Get passed/saved IDs to exclude
  const passedIds = profile.preferences?.passedOpportunityIds || [];
  const savedIds = profile.preferences?.savedOpportunityIds || [];
  const allExcludedIds = new Set([
    ...(excludeIds || []),
    ...passedIds,
    ...savedIds,
  ]);
  
  console.log('[matchOpportunities] Called', {
    totalInput: opportunities.length,
    profileEntityType: profile.entityType,
    profileFundingTypes: profile.fundingType,
    profileInterests: profile.interestsMain,
    minWinRate,
    negativeKeywordsCount: negativeKeywords.length,
    excludedIdsCount: allExcludedIds.size,
    passedIdsCount: passedIds.length,
    savedIdsCount: savedIds.length,
  });
  
  // STEP 1: Filter out passed/saved opportunities FIRST
  const notPassedOrSaved = opportunities.filter(opp => !allExcludedIds.has(opp.id));
  console.log(`[matchOpportunities] Filtered out passed/saved: ${opportunities.length} → ${notPassedOrSaved.length} opportunities`);
  
  // STEP 2: Pre-filter based on hard eligibility criteria and negative keywords
  // This removes ineligible opportunities BEFORE scoring
  const preFiltered = notPassedOrSaved.filter(opp => 
    preFilterForEntityType(opp, profile.entityType, negativeKeywords)
  );
  
  console.log(`[matchOpportunities] Pre-filtered ${notPassedOrSaved.length} → ${preFiltered.length} opportunities for ${profile.entityType} entity type`);
  
  // STEP 2: Calculate win rate for each pre-filtered opportunity
  const scored = preFiltered.map(opp => {
    const winRate = calculateWinRate(opp, profile);
    return { ...opp, winRate };
  });
  
  // STEP 3: Filter by minimum win rate
  const filtered = scored.filter(opp => (opp.winRate || 0) >= minWinRate);
  
  console.log('[matchOpportunities] After filtering', {
    minWinRate,
    totalScored: scored.length,
    totalKept: filtered.length,
    filteredOut: scored.length - filtered.length,
  });
  
  // STEP 4: Sort by win rate descending
  filtered.sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  
  // Log top 5 results
  const top5 = filtered.slice(0, 5).map(o => ({
    title: o.title?.substring(0, 50),
    winRate: o.winRate,
    type: o.type,
  }));
  console.log('[matchOpportunities] Top 5 results:', top5);
  
  return filtered;
}

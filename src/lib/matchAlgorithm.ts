import { Opportunity, UserProfile, FundingType, Interest, Timeline } from '@/types';

// Calculate win rate for an opportunity based on user profile
export function calculateWinRate(opportunity: Opportunity, profile: UserProfile): number {
  let score = 0;
  let maxScore = 0;

  // 1. Interest/Category Match (40 points) - HIGHEST WEIGHT
  maxScore += 40;
  const interestScore = matchesInterests(opportunity, profile.interestsMain, profile.grantsByInterest);
  score += interestScore;

  // 2. Funding Type Match (25 points)
  maxScore += 25;
  if (matchesFundingType(opportunity, profile.fundingType)) {
    score += 25;
  }

  // 3. Keywords Match (20 points)
  maxScore += 20;
  const keywordsScore = matchesKeywords(opportunity, profile.keywords || []);
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
  if (opportunity.type === 'RFP') {
    return fundingTypes.includes('contracts') || fundingTypes.includes('rfps');
  }
  
  // Grant opportunities
  if (opportunity.type === 'Grant') {
    return fundingTypes.includes('grants');
  }
  
  return false;
}

// Check if opportunity matches entity type
function matchesEntityType(opportunity: Opportunity, entityType: string): boolean {
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  const combined = `${title} ${desc}`;
  
  const entityMap: Record<string, string[]> = {
    'nonprofit': ['nonprofit', 'non-profit', '501c3', 'charity', 'charitable', 'ngo'],
    'for-profit': ['for-profit', 'business', 'company', 'corporation', 'enterprise', 'commercial'],
    'government': ['government', 'municipality', 'county', 'state', 'federal', 'public sector'],
    'education': ['education', 'school', 'university', 'college', 'academic', 'educational'],
    'individual': ['individual', 'person', 'artist', 'researcher', 'fellow'],
  };
  
  const keywords = entityMap[entityType.toLowerCase()] || [];
  
  // If any keyword matches, give full score
  for (const keyword of keywords) {
    if (combined.includes(keyword)) {
      return true;
    }
  }
  
  // If no explicit mention, still give partial credit (opportunity might be open to all)
  return false;
}

// Calculate interest match score (0-40 points) - HIGHEST WEIGHT
function matchesInterests(
  opportunity: Opportunity, 
  mainInterests: Interest[], 
  grantsByInterest: Interest[]
): number {
  const allInterests = [...new Set([...mainInterests, ...grantsByInterest])];
  
  if (allInterests.length === 0) return 0;
  
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  const category = (opportunity.category || '').toLowerCase();
  const combined = `${title} ${desc} ${category}`;
  
  // Interest keyword mapping
  const interestKeywords: Record<Interest, string[]> = {
    healthcare: ['health', 'medical', 'hospital', 'wellness', 'care', 'patient', 'clinical'],
    education: ['education', 'school', 'training', 'learning', 'student', 'academic', 'teacher'],
    environment: ['environment', 'climate', 'green', 'sustainability', 'conservation', 'renewable', 'ecology'],
    arts: ['art', 'culture', 'museum', 'creative', 'artist', 'music', 'theater', 'performance'],
    technology: ['technology', 'tech', 'software', 'digital', 'IT', 'computer', 'innovation', 'cyber'],
    'social-services': ['social', 'service', 'community', 'welfare', 'assistance', 'support', 'outreach'],
    research: ['research', 'study', 'scientific', 'investigation', 'analysis', 'development', 'R&D'],
    infrastructure: ['infrastructure', 'construction', 'building', 'facility', 'transportation', 'public works'],
    'economic-development': ['economic', 'development', 'business', 'growth', 'employment', 'workforce', 'jobs'],
    housing: ['housing', 'home', 'shelter', 'residential', 'affordable housing', 'homelessness'],
  };
  
  let matchedInterests = 0;
  
  for (const interest of allInterests) {
    const keywords = interestKeywords[interest] || [];
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        matchedInterests++;
        break; // Only count each interest once
      }
    }
  }
  
  // Score proportional to matched interests - full 40 points if all interests match
  const matchRatio = matchedInterests / allInterests.length;
  return Math.round(matchRatio * 40);
}

// Calculate keywords match score (0-20 points)
function matchesKeywords(opportunity: Opportunity, keywords: string[]): number {
  if (keywords.length === 0) return 10; // Neutral score if no keywords
  
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  const category = (opportunity.category || '').toLowerCase();
  const agency = (opportunity.agency || '').toLowerCase();
  const combined = `${title} ${desc} ${category} ${agency}`;
  
  let matchedKeywords = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase().trim();
    if (keywordLower.length > 0 && combined.includes(keywordLower)) {
      matchedKeywords++;
    }
  }
  
  // Score proportional to matched keywords (up to 20 points)
  // If 50%+ keywords match, give full score
  const matchRatio = matchedKeywords / keywords.length;
  if (matchRatio >= 0.5) return 20;
  if (matchRatio >= 0.3) return 15;
  if (matchRatio >= 0.1) return 8;
  return 0;
}

// Calculate timeline match score (0-5 points)
function matchesTimeline(opportunity: Opportunity, timeline: Timeline): number {
  const deadline = opportunity.closeDate || opportunity.deadline;
  if (!deadline) return 2; // Give neutral score if no deadline
  
  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // If deadline has passed, return 0
    if (daysUntil < 0) return 0;
    
    // Match based on user's timeline preference
    switch (timeline) {
      case 'immediate':
        // 0-30 days: full score, 31-60 days: partial score
        if (daysUntil <= 30) return 5;
        if (daysUntil <= 60) return 3;
        return 1;
        
      case '3-months':
        // 0-90 days: full score
        if (daysUntil <= 90) return 5;
        if (daysUntil <= 120) return 3;
        return 1;
        
      case '6-months':
        // 0-180 days: full score
        if (daysUntil <= 180) return 5;
        if (daysUntil <= 240) return 3;
        return 1;
        
      case '12-months':
        // 0-365 days: full score
        if (daysUntil <= 365) return 5;
        return 3;
        
      default:
        return 2;
    }
  } catch {
    return 2; // Neutral score if date parsing fails
  }
}

// Match and score all opportunities, return sorted by win rate
export function matchOpportunities(
  opportunities: Opportunity[], 
  profile: UserProfile,
  minWinRate: number = 0
): Opportunity[] {
  // Calculate win rate for each opportunity
  const scored = opportunities.map(opp => ({
    ...opp,
    winRate: calculateWinRate(opp, profile)
  }));
  
  // Filter by minimum win rate
  const filtered = scored.filter(opp => opp.winRate >= minWinRate);
  
  // Sort by win rate descending
  filtered.sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
  
  return filtered;
}

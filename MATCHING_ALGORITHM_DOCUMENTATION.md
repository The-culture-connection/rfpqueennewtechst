# Matching Algorithm Documentation

## 📍 Location of Matching Algorithm

**Primary Matching Function:** `src/lib/matchAlgorithm.ts`

The main function is:
- **`calculateWinRate(opportunity: Opportunity, profile: UserProfile): number`** (lines 4-38)
- **`matchOpportunities(opportunities: Opportunity[], profile: UserProfile, minWinRate?: number): Opportunity[]`** (lines 203-221)

---

## 📊 All Available Profile Data

Based on the `UserProfile` interface in `src/types/index.ts`:

### Core Profile Fields
```typescript
{
  uid: string;                    // User ID
  email: string;                  // User email
  entityName: string;             // Organization/entity name
  entityType: EntityType;         // 'nonprofit' | 'for-profit' | 'government' | 'education' | 'individual'
  fundingType: FundingType[];      // Array: 'grants' | 'rfps' | 'contracts' | 'accelerators' | 'investors'
  timeline: Timeline;             // 'immediate' | '3-months' | '6-months' | '12-months'
  interestsMain: Interest[];      // Primary interests array
  grantsByInterest: Interest[];   // Additional interests for grants
  keywords?: string[];            // Keywords extracted from documents or manually added
  positiveKeywords?: string[];    // User-defined keywords to prioritize/include
  negativeKeywords?: string[];     // User-defined keywords to omit/exclude
  businessProfile?: BusinessProfile;  // Extracted business information
  preferences?: UserPreferences;   // Learning from user behavior
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Profile (Nested)
```typescript
{
  companyOverview?: string;
  mission?: string;
  vision?: string;
  servicesCapabilities?: string[];
  pastPerformance?: string[];
  teamExperience?: string[];
  approachMethodology?: string;
  pricingModel?: string;
  certifications?: string[];
  problemStatementExamples?: string[];
  proposedSolutionExamples?: string[];
  outcomesImpact?: string[];
  keywords?: string[];
  lastUpdated?: string;
}
```

### User Preferences (Nested)
```typescript
{
  passedOpportunityIds?: string[];
  savedOpportunityIds?: string[];
  appliedOpportunityIds?: string[];
  passPatterns?: {
    keywords?: string[];
    agencies?: string[];
    amounts?: string[];
  };
  savePatterns?: {
    keywords?: string[];
    agencies?: string[];
    amounts?: string[];
  };
  lastAnalyzed?: Date;
}
```

### Interest Types Available
```typescript
'healthcare' | 'education' | 'environment' | 'arts' | 'technology' | 
'social-services' | 'research' | 'infrastructure' | 'economic-development' | 'housing'
```

---

## 🎯 Profile Data Used in Matching Algorithm

The **`calculateWinRate`** function uses the following profile fields:

### ✅ Used Fields:
1. **`profile.interestsMain`** - Primary interests (used in interest matching)
2. **`profile.grantsByInterest`** - Additional interests (combined with interestsMain)
3. **`profile.fundingType`** - Funding type preferences (array)
4. **`profile.keywords`** - User-defined keywords (optional, defaults to empty array)
5. **`profile.entityType`** - Entity type (nonprofit, for-profit, etc.) - **NOW USED FOR HARD FILTERING**
6. **`profile.timeline`** - Timeline preference (immediate, 3-months, etc.)
7. **`profile.negativeKeywords`** - **NEW:** User-defined exclusion keywords (auto-populated for for-profit if not set)
8. **`profile.preferences.passPatterns`** - **NEW:** Learned patterns from user behavior (keywords, agencies, amounts)

### ❌ NOT Used in Current Algorithm:
- `uid`, `email`, `entityName` - Not used in scoring
- `positiveKeywords` - Available but not yet used (future enhancement)
- `businessProfile` - Available but not used in basic algorithm (used in enhanced/intelligent algorithms)
- Other preference fields - Not used in basic algorithm

---

## 📐 Matching Algorithm Formula

### Overall Formula
```
Win Rate (%) = (Total Score / Max Score) × 100
```

### ⚠️ IMPORTANT: Pre-Filtering Step (NEW)
**Before scoring**, opportunities are pre-filtered using **`preFilterForEntityType()`**:
- **Hard eligibility filtering** based on structured fields (`applicantTypes`, `fundingActivityCategories`, `eligibleEntities`)
- **For for-profit startups**: Aggressively filters out opportunities targeted to individuals, students, nonprofits only, academic research, etc.
- **For other entity types**: Filters out incompatible opportunities
- Opportunities that fail pre-filtering are **completely excluded** (not scored)

### Scoring Breakdown (Total: 100 points)

#### 1. Interest/Category Match (40 points) - HIGHEST WEIGHT
- **Function:** `matchesInterests()` (updated)
- **Input:** `profile.interestsMain` + `profile.grantsByInterest` + `profile.entityType`
- **Method:**
  - Combines all interests from both arrays (removes duplicates)
  - Searches opportunity `title`, `description`, and `category` fields
  - **NEW:** Distinguishes between **commercial** vs **academic** keywords for each interest
  - **For for-profit entities:** Prioritizes commercial keywords, filters out pure academic research
  - **For SBIR/STTR programs:** Allows research keywords (these are commercial R&D programs)
  - Uses split keyword mappings (commercial/academic) for better matching
  - Counts how many interests match
  - **Formula:** `(matchedInterests / totalInterests) × 40`
  - **Interest Keywords:**
    - healthcare: ['health', 'medical', 'hospital', 'wellness', 'care', 'patient', 'clinical']
    - education: ['education', 'school', 'training', 'learning', 'student', 'academic', 'teacher']
    - environment: ['environment', 'climate', 'green', 'sustainability', 'conservation', 'renewable', 'ecology']
    - arts: ['art', 'culture', 'museum', 'creative', 'artist', 'music', 'theater', 'performance']
    - technology: ['technology', 'tech', 'software', 'digital', 'IT', 'computer', 'innovation', 'cyber']
    - social-services: ['social', 'service', 'community', 'welfare', 'assistance', 'support', 'outreach']
    - research: ['research', 'study', 'scientific', 'investigation', 'analysis', 'development', 'R&D']
    - infrastructure: ['infrastructure', 'construction', 'building', 'facility', 'transportation', 'public works']
    - economic-development: ['economic', 'development', 'business', 'growth', 'employment', 'workforce', 'jobs']
    - housing: ['housing', 'home', 'shelter', 'residential', 'affordable housing', 'homelessness']

#### 2. Funding Type Match (25 points)
- **Function:** `matchesFundingType()` (lines 41-53)
- **Input:** `profile.fundingType` (array)
- **Method:**
  - Checks if opportunity `type` matches user preferences
  - RFP opportunities → matches 'contracts' or 'rfps'
  - Grant opportunities → matches 'grants'
  - **Formula:** Binary (25 points if match, 0 if no match)

#### 3. Keywords Match (20 points)
- **Function:** `matchesKeywords()` (updated)
- **Input:** `profile.keywords` + `profile.negativeKeywords` + `profile.preferences.passPatterns`
- **Method:**
  - **NEW: Hard Exclusion Check First:**
    - Checks `negativeKeywords` (user-defined or auto-populated defaults)
    - Checks `passPatterns` (learned from user behavior)
    - If any negative pattern matches → **0 points (hard exclusion)**
  - Then searches opportunity `title`, `description`, `category`, and `agency` fields
  - Counts how many user keywords appear in opportunity text
  - **Formula:**
    - If negative keywords match: **0 points (hard exclusion)**
    - If pass patterns match: **0 points (hard exclusion)**
    - If no keywords: 10 points (neutral score)
    - If 50%+ keywords match: 20 points
    - If 30%+ keywords match: 15 points
    - If 10%+ keywords match: 8 points
    - Otherwise: 0 points

#### 4. Entity Type Match (10 points)
- **Function:** `matchesEntityType()` (updated)
- **Input:** `profile.entityType`
- **Method:**
  - **NEW:** First checks structured `applicantTypes` field (most reliable)
  - Falls back to searching opportunity `title` and `description` fields
  - Uses predefined keyword mappings for entity types
  - **Note:** This is now a **secondary boost**, not the main eligibility gate
  - Main eligibility filtering happens in `preFilterForEntityType()` before scoring
  - **Formula:** Binary (10 points if match, 0 if no match)
  - **Entity Keywords:**
    - nonprofit: ['nonprofit', 'non-profit', '501c3', 'charity', 'charitable', 'ngo']
    - for-profit: ['for-profit', 'business', 'company', 'corporation', 'enterprise', 'commercial']
    - government: ['government', 'municipality', 'county', 'state', 'federal', 'public sector']
    - education: ['education', 'school', 'university', 'college', 'academic', 'educational']
    - individual: ['individual', 'person', 'artist', 'researcher', 'fellow']

#### 5. Timeline Match (5 points)
- **Function:** `matchesTimeline()` (lines 157-200)
- **Input:** `profile.timeline`
- **Method:**
  - Calculates days until opportunity deadline
  - Matches based on user's timeline preference
  - **Formula:**
    - If deadline passed: 0 points
    - If no deadline: 2 points (neutral)
    - **Timeline-specific scoring:**
      - **immediate:**
        - 0-30 days: 5 points
        - 31-60 days: 3 points
        - Otherwise: 1 point
      - **3-months:**
        - 0-90 days: 5 points
        - 91-120 days: 3 points
        - Otherwise: 1 point
      - **6-months:**
        - 0-180 days: 5 points
        - 181-240 days: 3 points
        - Otherwise: 1 point
      - **12-months:**
        - 0-365 days: 5 points
        - Otherwise: 3 points

---

## 🔄 Matching Process Flow

1. **Input:** Array of opportunities + User profile
2. **NEW: Pre-Filter Step:**
   - Apply `preFilterForEntityType()` to remove ineligible opportunities
   - Uses structured fields (`applicantTypes`, `fundingActivityCategories`, `eligibleEntities`)
   - Hard filters based on entity type (e.g., for-profit startups exclude academic-only grants)
   - Logs filtering results
3. **For each pre-filtered opportunity:**
   - Calculate win rate using `calculateWinRate()`
   - Add `winRate` property to opportunity object
4. **Filter:** Remove opportunities below `minWinRate` threshold (default: 0)
5. **Sort:** Order by win rate (descending)
6. **Output:** Sorted array of matched opportunities

---

## 📝 Code Example

```typescript
// From src/lib/matchAlgorithm.ts

export function calculateWinRate(opportunity: Opportunity, profile: UserProfile): number {
  let score = 0;
  let maxScore = 0;

  // 1. Interest/Category Match (40 points)
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
```

---

## 📈 Weight Summary

| Factor | Weight | Points | Percentage |
|--------|--------|--------|------------|
| Interest/Category Match | Highest | 40 | 40% |
| Funding Type Match | High | 25 | 25% |
| Keywords Match | Medium | 20 | 20% |
| Entity Type Match | Low | 10 | 10% |
| Timeline Match | Lowest | 5 | 5% |
| **Total** | | **100** | **100%** |

## 🆕 New Features (Latest Update)

### 1. Hard Eligibility Pre-Filtering
- **Function:** `preFilterForEntityType(opportunity, entityType)`
- Filters opportunities **before scoring** based on structured eligibility fields
- For for-profit startups: Excludes academic-only grants, individual fellowships, nonprofit-only opportunities
- Uses `applicantTypes`, `fundingActivityCategories`, `eligibleEntities` from Grants.gov/SAM.gov APIs

### 2. Negative Keywords Support
- **Function:** `getDefaultNegativeKeywords(entityType)`
- Auto-populates negative keywords for for-profit startups if user hasn't set their own
- Hard exclusion: Opportunities matching negative keywords get 0 points
- Default negative keywords include: "postdoctoral fellowship", "undergraduate", "k-12", "nonprofit only", etc.

### 3. Pass Pattern Learning
- Uses `profile.preferences.passPatterns` to learn from user behavior
- Hard exclusion: Opportunities matching learned pass patterns get 0 points
- Patterns include: keywords, agencies, amounts that user consistently passes on

### 4. Improved Interest Matching
- Split keyword sets: Commercial vs Academic keywords for each interest
- For for-profit: Prioritizes commercial keywords, filters pure academic research
- SBIR/STTR exception: Allows research keywords for these commercial R&D programs
- Better distinction between "user research" (commercial) vs "academic research" (excluded)

### 5. Enhanced Entity Type Matching
- First checks structured `applicantTypes` field (most reliable)
- Falls back to text search in title/description
- Now used as secondary boost (eligibility handled by pre-filter)

---

## 🔍 Additional Notes

- The algorithm is case-insensitive (all text is converted to lowercase)
- Keyword matching uses simple substring search (not fuzzy matching)
- Each interest is only counted once (even if multiple keywords match)
- Timeline scoring gives neutral points (2) if deadline information is missing
- Keywords scoring gives neutral points (10) if user has no keywords defined
- The final win rate is rounded to the nearest integer
- **NEW:** Negative keywords are auto-populated for for-profit startups if not set by user
- **NEW:** Pre-filtering happens BEFORE scoring, so ineligible opportunities never get scored
- **NEW:** Interest matching distinguishes commercial vs academic keywords for better startup matching
- **NEW:** Pass patterns from user behavior are used for hard exclusions

---

## 🚀 Usage

The matching algorithm is called from:
- `src/hooks/useOpportunities.ts` - Main hook that loads and matches opportunities
- Opportunities are filtered to show only those with win rate ≥ 30% by default (configurable)


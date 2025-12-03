# Intelligent Matching Algorithm Implementation

## 🎯 Overview

This implementation creates a sophisticated, AI-powered opportunity matching system that analyzes user profiles, business documents, and behavioral patterns to provide highly personalized fundraising opportunity recommendations.

## 🚀 Key Features

### 1. **Intelligent Matching Algorithm** (`src/lib/intelligentMatchAlgorithm.ts`)

The new matching system evaluates opportunities across **11 detailed fit components**:

#### Fit Components (0-1 scale each):

1. **eligibilityFit** - Hard eligibility requirements (entity type, funding type alignment)
2. **interestKeywordFit** - Alignment with user's declared interests
3. **structureFit** - Organizational structure compatibility
4. **populationFit** - Target population/demographic alignment
5. **amountFit** - Funding amount appropriateness
6. **timingFit** - Deadline alignment with user timeline preferences
7. **businessProfileFit** - Overall business profile semantic matching
8. **capabilityFit** - Services/capabilities alignment
9. **experienceFit** - Past performance and team experience relevance
10. **missionFit** - Mission/vision alignment with opportunity goals
11. **userPreferenceFit** - Behavioral learning from past actions

#### Adaptive Weighting System:

The algorithm dynamically adjusts weights based on available data:
- Base weights prioritize eligibility (20%) and interests (15%)
- When business profile exists, adds 35% weight across profile-based components
- When user preferences exist, adds 5% weight for behavioral learning
- Weights are normalized to always sum to 100%

### 2. **Personalized Descriptions**

Each opportunity receives a **custom description** highlighting:

- **Why You're Eligible**: Specific reasons based on entity type, interests, and profile
- **Capability Matches**: How your services align with opportunity needs
- **Mission Alignment**: Quotes from your mission that match opportunity goals
- **Experience Highlights**: Relevant past performance indicators
- **Competitive Advantages**: Unique strengths for this opportunity
- **Behavioral Insights**: Patterns from similar opportunities you've saved

Example output:
```
**Why You're Eligible:** Your nonprofit entity type aligns with this opportunity

Your expertise in professional networking and business discovery directly addresses 
the core requirements of this opportunity.

This aligns with your mission: "The Culture Connection is a digital platform and 
community ecosystem designed to accelerate the growth..."

**Key Insight:** Based on your previous interests, this opportunity matches patterns 
from opportunities you've saved.

Deadline is 45 days away, which aligns with your 3-months timeline.

**Competitive Advantage:** Your profile suggests you have the qualifications to be 
a competitive applicant.
```

### 3. **Preference Learning System** (`src/lib/preferenceLearning.ts`)

Tracks and learns from user behavior:

#### What It Tracks:
- **Passed Opportunities**: Keywords, agencies, and amounts in passed opportunities
- **Saved Opportunities**: Patterns in saved opportunities
- **Applied Opportunities**: High-intent signals

#### How It Learns:
- Extracts meaningful keywords (filters stop words, numbers)
- Identifies frequently passed/saved agencies
- Categorizes funding amounts into ranges
- Updates patterns in real-time after each action
- Stores in Firestore: `/profiles/{userId}/preferences/learned`

#### Pattern Analysis:
```javascript
passPatterns: {
  keywords: ["technology", "software", "consulting"],
  agencies: ["Department of Education"],
  amounts: ["under-10k", "10k-25k"]
}

savePatterns: {
  keywords: ["community", "networking", "professional"],
  agencies: ["National Science Foundation"],
  amounts: ["100k-250k", "250k-500k"]
}
```

### 4. **Executive Summary Upload** (`src/app/executive-summary/page.tsx`)

New page for uploading business documents:

#### Features:
- Upload PDF, DOCX, or TXT files (max 10MB)
- AI extraction using existing document analysis pipeline
- Real-time processing status (Uploading → Analyzing → Complete)
- Display extracted business profile:
  - Company Overview
  - Mission & Vision
  - Services & Capabilities
  - Certifications
  - Past Performance

#### Integration:
- Uses `/api/upload-document` endpoint
- Uses `/api/extract-document` for AI analysis
- Stores in `/profiles/{userId}/businessProfile/master`
- Automatically enhances future opportunity matching

### 5. **Enhanced UI Display**

Updated `OpportunityCard` component shows:

#### Match Score Badge:
- **Exceptional Match (75+)**: Purple gradient
- **Strong Match (60-74)**: Yellow
- **Moderate Match (45-59)**: Orange
- **Limited Match (<45)**: Gray

#### Eligibility Highlights Section:
```
✅ Why You're Eligible:
• Your nonprofit entity type aligns with this opportunity
• Matches your focus areas: healthcare, education, social-services
• Track record aligns with opportunity requirements
```

#### Key Strengths Section:
```
🎯 Key Strengths:
• Strong eligibility match
• Aligns with your interests in healthcare, education
• Your capabilities directly address opportunity needs
```

#### Considerations Section:
```
⚠️ Considerations:
• Deadline may be too soon for your preferences
• Eligibility requirements may need verification
```

#### Confidence Score:
- Displayed when ≥70%
- Based on data completeness:
  - Business profile: +30 points
  - User preferences: +20 points
  - Keywords: +20 points
  - Eligibility highlights: +10 each

## 📊 Data Flow

### Opportunity Matching Flow:

```
1. User logs in → Dashboard loads
2. Load user profile from Firestore
3. Load business profile (/businessProfile/master)
4. Load user preferences (/preferences/learned)
5. Fetch opportunities from API
6. Run intelligentMatchOpportunities():
   - Calculate 11 fit components per opportunity
   - Generate weighted match score (0-100)
   - Create personalized description
   - Generate match reasoning with strengths/concerns
7. Filter opportunities ≥35% match score
8. Sort by match score (highest first)
9. Display with enhanced UI
```

### User Action Tracking Flow:

```
User clicks Pass/Save/Apply
    ↓
trackUserAction(userId, opportunity, action, db)
    ↓
Extract patterns from opportunity:
  - Keywords (meaningful words)
  - Agency name
  - Amount category
    ↓
Update /profiles/{userId}/preferences/learned:
  - Add opportunity ID to passedOpportunityIds/savedOpportunityIds
  - Merge keywords into passPatterns/savePatterns
  - Merge agencies
    ↓
Next opportunity load uses updated preferences
    ↓
userPreferenceFit component adjusts scores:
  - Boost if similar to saved opportunities
  - Reduce if similar to passed opportunities
```

## 🔧 Technical Implementation

### Files Created:
1. `src/lib/intelligentMatchAlgorithm.ts` - Core matching logic (650+ lines)
2. `src/lib/preferenceLearning.ts` - Behavioral tracking (250+ lines)
3. `src/app/executive-summary/page.tsx` - Upload interface (200+ lines)

### Files Modified:
1. `src/hooks/useOpportunities.ts` - Uses intelligent algorithm
2. `src/app/dashboard/page.tsx` - Tracks user actions
3. `firestore.rules` - Added preferences collection rules

### Firestore Structure:

```
profiles/{userId}/
  ├── (profile data)
  ├── businessProfile/
  │   └── master/
  │       ├── companyOverview
  │       ├── mission
  │       ├── vision
  │       ├── servicesCapabilities[]
  │       ├── pastPerformance[]
  │       └── ...
  ├── preferences/
  │   └── learned/
  │       ├── passedOpportunityIds[]
  │       ├── savedOpportunityIds[]
  │       ├── passPatterns
  │       ├── savePatterns
  │       └── lastAnalyzed
  └── tracker/
      ├── saved/
      └── applied/
```

## 🎨 UI Enhancements

### Dashboard Navigation:
Added "Executive Summary" button between "Documents" and "Edit Profile"

### Opportunity Cards:
- Dynamic color-coded match badges
- Confidence score indicators
- Collapsible eligibility sections
- Strength/concern lists
- Personalized descriptions with markdown formatting

## 🧪 Testing

Created `tests/executive-summary.spec.ts` with Playwright tests:
- Executive summary page navigation
- File upload functionality
- Business profile display
- Personalized match analysis display
- Preference tracking verification

### Run Tests:
```bash
npm run test
```

## 📈 Performance Considerations

### Caching:
- Opportunities cached for 24 hours
- Cache invalidated when profile changes
- Cache key includes businessProfile and preferences flags

### Optimization:
- Keyword extraction uses Set for deduplication
- Pattern matching uses efficient string operations
- Firestore queries use merge: true for incremental updates

## 🚀 Deployment

### Changes Pushed to GitHub:
```bash
git add src/lib/intelligentMatchAlgorithm.ts \
        src/lib/preferenceLearning.ts \
        src/app/executive-summary/ \
        src/hooks/useOpportunities.ts \
        src/app/dashboard/page.tsx \
        firestore.rules

git commit -m "Add intelligent matching algorithm with executive summary analysis and preference learning"

git push origin main
```

### Firestore Rules Deployed:
Updated rules include:
```javascript
match /preferences/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## 📝 Usage Instructions

### For Users:

1. **Upload Executive Summary**:
   - Click "Executive Summary" in dashboard
   - Upload PDF/DOCX/TXT file
   - Wait for AI analysis (30-60 seconds)
   - Review extracted business profile

2. **Review Opportunities**:
   - Dashboard shows personalized matches
   - Read "Why You're Eligible" section
   - Check Key Strengths and Considerations
   - Note confidence score

3. **Take Actions**:
   - Pass: System learns you're not interested in similar opportunities
   - Save: System learns you like similar opportunities
   - Apply: Highest signal of interest

4. **Improve Matching**:
   - System automatically learns from your actions
   - Upload more documents for better profile
   - Add keywords in Edit Profile
   - More actions = better recommendations

## 🎯 Results

### Before:
- Binary win rate percentages (45%, 67%, etc.)
- Generic descriptions
- No learning from user behavior
- Limited profile utilization

### After:
- Nuanced match scores with 11 components
- Personalized eligibility explanations
- Adaptive learning from passes/saves
- Deep business profile integration
- Confidence scoring
- Specific strengths and concerns
- Behavioral pattern recognition

## 🔮 Future Enhancements

1. **AI-Generated Proposals**: Use business profile to auto-fill applications
2. **Collaborative Filtering**: Learn from similar users' preferences
3. **Temporal Patterns**: Learn time-of-day and seasonal preferences
4. **A/B Testing**: Test different matching algorithms
5. **Explainable AI**: More detailed reasoning for each score component
6. **Feedback Loop**: Let users rate match quality to improve algorithm

## 📞 Support

For questions or issues:
- Check console logs for debugging info
- Review Firestore data structure
- Test with executive summary example provided
- Verify all dependencies installed

---

**Status**: ✅ Fully Implemented and Deployed
**Last Updated**: December 3, 2025
**Version**: 2.0.0


# Matching Algorithm Improvements

## Overview
The matching algorithm has been significantly improved to be more accurate, stricter (returns fewer but better matches), and includes OpenAI integration for win rate refinement.

## Key Improvements

### 1. Enhanced Keyword Matching
- **Fuzzy Matching**: Handles plurals, variants, and related phrases
- **Text Normalization**: Strips punctuation, normalizes whitespace, handles case-insensitive matching
- **Stemming**: Removes common suffixes (ing, ed, s, es) to match word variants
- **OR Logic**: Uses weighted scoring instead of strict AND requirements

**Before**: Required exact string matches
```typescript
blob.includes(keyword) // Only exact matches
```

**After**: Fuzzy matching with normalization
```typescript
fuzzyContains(normalizedText, keyword) // Handles plurals, variants
```

### 2. Two-Stage Filtering System

#### Stage A: Hard Eligibility Filter (Stricter)
- **Interest Keywords**: Requires at least 30% of interest keywords to match (was 100% before)
- **User Keywords**: Requires at least one user keyword match (if provided)
- **Negative Keywords**: Filters out incompatible opportunities
- **Timeline**: Matches user's preferred timeline (urgent/soon/ongoing)

#### Stage B: Fit Score Calculation (0-100)
Weighted scoring with multiple components:
- **Eligibility Fit** (30%): Organization type, location, tax status alignment
- **Interest Keyword Fit** (25%): How well interests match (requires 50%+ for full score)
- **Structure Fit** (15%): Organization structure alignment
- **Population Fit** (15%): Population served alignment
- **Amount Fit** (10%): Funding amount alignment
- **Timing Fit** (5%): Deadline/timing alignment

**Formula**:
```
Fit Score = 30*eligibility + 25*interest + 15*structure + 15*population + 10*amount + 5*timing
Final Score = Fit Score + Recency Bonus (0-10 points)
```

### 3. OpenAI Win Rate Refinement

The algorithm now uses OpenAI to refine win rate predictions for top candidates:

1. **Base Win Rate**: Calculated from fit score using heuristic mapping
   - Score < 30: 3-5% win rate
   - Score 30-50: 8-12% win rate
   - Score 50-70: 15-22% win rate
   - Score 70-85: 25-35% win rate
   - Score > 85: 40-50% win rate

2. **AI Refinement**: For top 100 candidates, OpenAI analyzes:
   - Opportunity details (title, agency, description, deadline)
   - Organization profile (interests, keywords, purpose, entity type)
   - Business profile (from document extraction)
   - Fit score components

3. **Blended Prediction**: 70% AI prediction + 30% base score

**Fallback**: If OpenAI is unavailable or fails, uses heuristic mapping

### 4. Stricter Filtering (Fewer Matches)

**Changes**:
- Interest keyword match threshold: 30% (was 100% AND requirement)
- Requires at least one user keyword match (if provided)
- Better negative keyword filtering
- Results sorted by refined win rate (highest first)

**Result**: Fewer but higher-quality matches

## Configuration

### Environment Variables

Add to Firebase Functions environment:
```bash
firebase functions:config:set openai.api_key="your-openai-api-key"
```

Or set in `.env` file:
```
OPENAI_API_KEY=your-openai-api-key
```

### OpenAI Model

Currently using `gpt-4o-mini` for cost efficiency. Can be changed in `refineWinRateWithAI()` function.

## Usage

The function automatically:
1. Filters opportunities using strict eligibility criteria
2. Calculates fit scores with weighted components
3. Refines win rates for top 100 candidates using OpenAI
4. Sorts results by win rate (highest first)
5. Returns top matches (default 150, max 500)

**API Call**:
```typescript
const result = await matchOpportunities({ pageSize: 150 });
// Results sorted by winRate (highest first)
```

## Performance Considerations

- **OpenAI Calls**: Limited to top 100 candidates to control costs
- **Caching**: Consider caching AI predictions for similar opportunities
- **Rate Limiting**: OpenAI API has rate limits; function handles errors gracefully

## Future Enhancements

1. **Eligibility Checks**: Add org type, location, tax status matching
2. **Population Matching**: Match populations served (youth, BIPOC, etc.)
3. **Amount Matching**: Match funding amount ranges
4. **Structure Matching**: Better org type alignment
5. **Caching**: Cache AI predictions to reduce API calls
6. **Learning**: Collect user outcomes to improve predictions over time

## Testing

To test the improvements:
1. Deploy the function: `firebase deploy --only functions:matchOpportunities`
2. Check logs: `firebase functions:log --only matchOpportunities`
3. Verify:
   - Fewer results (stricter filtering)
   - Higher quality matches
   - Win rates refined with AI (if OpenAI key is set)
   - Results sorted by win rate

## Migration Notes

- **Backward Compatible**: Function signature unchanged
- **New Fields**: Results include `fitComponents` (for debugging)
- **Win Rates**: Now AI-refined (if OpenAI available)
- **Sorting**: Changed to prioritize win rate over score


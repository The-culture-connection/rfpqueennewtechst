# Matching Function Debugging Guide

## Enhanced Logging Added

The matching function now includes comprehensive logging to help debug:

1. **Profile Data Logging** (`prefs` log):
   - All interests extracted from profile
   - Interest keywords generated from interests
   - User-provided keywords
   - Combined keyword count
   - Funding types and timeline

2. **Filtering Statistics** (`filtering_stats` log):
   - `skippedNoInterests`: Opportunities skipped because they didn't match ALL interest keywords (AND logic)
   - `skippedNoUserKeywords`: Opportunities skipped because they didn't match any user keywords
   - `skippedNegatives`: Opportunities skipped due to negative keywords
   - `skippedTimeline`: Opportunities skipped due to timeline mismatch
   - `matchedCount`: Total opportunities that passed all filters

3. **Sample Results** (`sample_results` log):
   - Top 5 results with their scores, win rates, and whether all interests matched
   - Helps verify scoring is working correctly

4. **Final Summary** (`matchOpportunities done` log):
   - Average win rate across all returned results
   - Total results returned

## Key Changes Made

### 1. Keyword Prioritization
- **Increased keyword weight**: Changed from `1.5x` to `2.0x` per keyword match
- **Increased AND bonus**: Changed from `5.0` to `10.0` points when ALL interests match
- This ensures opportunities matching all interests and keywords rank higher

### 2. Win Rate Calculation
- Now calculates a proper percentage (0-100) based on:
  - Keyword matches (weighted 2.0x)
  - Recency score (max 1.0)
  - Timeline match (max 0.8)
  - Soon bonus (max 0.7)
  - All interests bonus (max 10.0)
- Win rate is stored in each result for easier sorting and display

### 3. AND Logic for Interests
- **Strict AND matching**: ALL interest keywords must be present in the opportunity
- If any interest keyword is missing, the opportunity is skipped
- This ensures only highly relevant opportunities are shown

### 4. User Keywords
- User-provided keywords use OR logic (at least one must match)
- Combined with interest keywords for scoring
- Both types contribute to the final score

## How to View Logs

### View all logs:
```bash
firebase functions:log
```

### View only matchOpportunities logs:
```bash
firebase functions:log --only matchOpportunities
```

### View recent logs with filtering:
```bash
firebase functions:log --only matchOpportunities --limit 50
```

## Expected Log Output

When the function runs, you should see logs like:

```
[INFO] matchOpportunities start { uid: "..." }
[INFO] prefs { 
  fundingTypes: ["grants"],
  timeline: "ongoing",
  interestsCount: 3,
  interests: ["Education", "Health & Medical", "Technology"],
  interestKeywordsCount: 15,
  interestKeywords: ["education", "school", "health", "medical", ...],
  userKeywordsCount: 5,
  userKeywords: ["STEM", "youth", "after school", ...],
  allKeywordsCount: 20,
  negativesLen: 0
}
[INFO] filtering_stats {
  skippedNoInterests: 150,
  skippedNoUserKeywords: 30,
  skippedNegatives: 10,
  skippedTimeline: 5,
  matchedCount: 25,
  totalScanned: 220
}
[INFO] sample_results {
  sample: [
    { title: "...", score: 45.2, winRate: 85, allInterestsMatch: true },
    ...
  ]
}
[INFO] matchOpportunities done { runId: "...", returned: 25, avgWinRate: 72 }
```

## Troubleshooting

### If keywords aren't being used:
1. Check the `prefs` log to verify keywords are extracted from profile
2. Verify `userKeywords` array is not empty
3. Check if `interestKeywords` are being generated correctly

### If AND logic isn't working:
1. Check `filtering_stats` - `skippedNoInterests` should be high if AND is strict
2. Verify `allInterestsMatch` flag in sample results
3. Check if interest keywords are too specific (might need to adjust INTEREST_KEYWORDS map)

### If win rates seem off:
1. Check the `sample_results` to see actual scores vs win rates
2. Verify maxScore calculation matches the scoring weights
3. Check if opportunities with `allInterestsMatch: true` have higher win rates


# Opportunity Description Snippet Options

## Current State
- Displays full `opportunity.description` with simple truncation (`line-clamp-3`)
- Shows "Show more/less" button if description > 150 chars
- No intelligent extraction or summarization

## Proposed Options

### Option 1: Smart Sentence Extraction (Recommended - Fast & Simple)
**Approach**: Extract the first 1-2 complete sentences that contain meaningful content.

**Pros:**
- ✅ Fast (client-side, no API calls)
- ✅ Preserves readability
- ✅ Works with any description format
- ✅ Easy to implement

**Cons:**
- ⚠️ May not always capture the most relevant info
- ⚠️ Doesn't prioritize user interests

**Implementation:**
```typescript
function extractSmartSnippet(description: string, maxLength: number = 200): string {
  // Remove extra whitespace
  const clean = description.trim().replace(/\s+/g, ' ');
  
  // Find first sentence(s) that fit
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    // No sentence endings, just truncate at word boundary
    return clean.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  // Take sentences until we hit maxLength
  let snippet = '';
  for (const sentence of sentences) {
    if ((snippet + sentence).length <= maxLength) {
      snippet += sentence;
    } else {
      break;
    }
  }
  
  return snippet || sentences[0].substring(0, maxLength) + '...';
}
```

---

### Option 2: Keyword-Prioritized Extraction
**Approach**: Extract sentences that contain user's interests/keywords first.

**Pros:**
- ✅ Most relevant to user
- ✅ Highlights why opportunity matches
- ✅ Client-side (fast)

**Cons:**
- ⚠️ Requires user profile/keywords
- ⚠️ May skip important eligibility info

**Implementation:**
```typescript
function extractKeywordSnippet(
  description: string, 
  keywords: string[], 
  maxLength: number = 200
): string {
  const sentences = description.match(/[^.!?]+[.!?]+/g) || [];
  const keywordSentences: string[] = [];
  const otherSentences: string[] = [];
  
  // Categorize sentences
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const hasKeyword = keywords.some(kw => 
      lowerSentence.includes(kw.toLowerCase())
    );
    if (hasKeyword) {
      keywordSentences.push(sentence);
    } else {
      otherSentences.push(sentence);
    }
  });
  
  // Prioritize keyword sentences
  const prioritized = [...keywordSentences, ...otherSentences];
  let snippet = '';
  for (const sentence of prioritized) {
    if ((snippet + sentence).length <= maxLength) {
      snippet += sentence;
    } else {
      break;
    }
  }
  
  return snippet || description.substring(0, maxLength) + '...';
}
```

---

### Option 3: Structured Information Extraction
**Approach**: Extract key structured info (eligibility, amount, purpose) and format as a snippet.

**Pros:**
- ✅ Most informative
- ✅ Consistent format
- ✅ Easy to scan

**Cons:**
- ⚠️ May miss narrative context
- ⚠️ Requires parsing logic for each source

**Implementation:**
```typescript
function extractStructuredSnippet(opportunity: Opportunity): string {
  const parts: string[] = [];
  
  // Extract key phrases
  const desc = opportunity.description.toLowerCase();
  
  // Eligibility
  if (desc.includes('eligible') || desc.includes('qualify')) {
    const eligibilityMatch = opportunity.description.match(
      /(?:eligible|qualify)[^.]{0,100}\./i
    );
    if (eligibilityMatch) parts.push(eligibilityMatch[0]);
  }
  
  // Funding amount
  if (opportunity.amount) {
    parts.push(`Funding: ${opportunity.amount}`);
  }
  
  // Purpose/Objective
  const purposeMatch = opportunity.description.match(
    /(?:purpose|objective|goal|aim)[^.]{0,100}\./i
  );
  if (purposeMatch) parts.push(purposeMatch[0]);
  
  // Deadline urgency
  if (opportunity.closeDate) {
    const days = daysUntilDeadline(opportunity.closeDate);
    if (days !== null && days <= 30) {
      parts.push(`Deadline in ${days} days`);
    }
  }
  
  return parts.join(' • ') || extractSmartSnippet(opportunity.description);
}
```

---

### Option 4: AI-Generated Summaries (Server-Side)
**Approach**: Use OpenAI to generate concise, relevant summaries when opportunities are matched.

**Pros:**
- ✅ Best quality summaries
- ✅ Can prioritize user interests
- ✅ Consistent format

**Cons:**
- ❌ Requires API calls (cost & latency)
- ❌ More complex implementation
- ❌ Need to cache/store summaries

**Implementation:**
- Generate summaries in `matchOpportunities` function
- Store in Firestore with opportunity results
- Cache for reuse

---

### Option 5: Hybrid Approach (Recommended for Best UX)
**Approach**: Combine multiple methods with fallbacks.

**Priority:**
1. **Structured extraction** (if key info found)
2. **Keyword-prioritized** (if user keywords available)
3. **Smart sentence extraction** (fallback)

**Pros:**
- ✅ Best of all worlds
- ✅ Adapts to available data
- ✅ Fast with smart fallbacks

**Cons:**
- ⚠️ More complex code
- ⚠️ Need to test all paths

**Implementation:**
```typescript
function getOpportunitySnippet(
  opportunity: Opportunity,
  userKeywords?: string[]
): string {
  const maxLength = 200;
  
  // Try structured first
  const structured = extractStructuredSnippet(opportunity);
  if (structured.length > 50) return structured;
  
  // Try keyword-prioritized if keywords available
  if (userKeywords && userKeywords.length > 0) {
    const keywordSnippet = extractKeywordSnippet(
      opportunity.description,
      userKeywords,
      maxLength
    );
    if (keywordSnippet.length > 50) return keywordSnippet;
  }
  
  // Fallback to smart extraction
  return extractSmartSnippet(opportunity.description, maxLength);
}
```

---

## Recommendation

**Start with Option 5 (Hybrid)** because:
1. Provides best user experience
2. Works with or without user profile
3. Fast (all client-side)
4. Can upgrade to AI later if needed

**Future Enhancement:**
- Add Option 4 (AI summaries) as an optional premium feature
- Generate summaries server-side and cache them
- Use for opportunities with very long descriptions

## Implementation Plan

1. Create utility functions in `webapp/src/lib/opportunitySnippets.ts`
2. Update `OpportunityCard` to use snippet function
3. Pass user keywords from dashboard context
4. Test with various opportunity types
5. Add "Show full description" button that expands to full text


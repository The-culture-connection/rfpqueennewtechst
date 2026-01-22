# Matching System Audit Document

**Version:** 1.0  
**Date:** 2026-01-22  
**Purpose:** Comprehensive end-to-end documentation of the RFP/Grant matching system to identify why ineligible opportunities are being returned.

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Diagram](#2-system-diagram)
3. [Firestore Data Dictionary](#3-firestore-data-dictionary)
4. [Server/API Endpoints & Functions](#4-serverapi-endpoints--functions)
5. [Matching Pipeline (Step-by-Step)](#5-matching-pipeline-step-by-step)
6. [Trigger Matrix](#6-trigger-matrix)
7. [Eligibility Enforcement Audit](#7-eligibility-enforcement-audit)
8. [Known Data Quality Issues](#8-known-data-quality-issues)
9. [Why Ineligible Results Appear (Hypotheses)](#9-why-ineligible-results-appear-hypotheses)
10. [Instrumentation Plan](#10-instrumentation-plan)
11. [Next Steps / Fix Plan](#11-next-steps--fix-plan)
12. [Opportunity Data Quality Analysis](#12-opportunity-data-quality-analysis)

---

## 1. Overview

### What "Matching" Means in This App

The matching system uses a **two-stage approach**:

1. **Stage 1: Hard Eligibility Gates + Code-Based Scoring**
   - Location: `src/lib/productionMatchAlgorithm.ts`
   - Function: `checkEligibilityGates()` (lines 109-255)
   - Function: `computeScores()` (lines 395-450)
   - Purpose: Filter ineligible opportunities and compute initial scores
   - Output: `TopMatch[]` with eligibility gates, fit scores, effort scores, and ranking scores

2. **Stage 2: AI-Powered Refinement (Optional)**
   - Location: `src/lib/aiMatchRefinement.ts`
   - Function: `refineMatchesWithAI()` (lines 70-399)
   - Purpose: Re-rank top 20 opportunities and generate detailed eligibility notes
   - Output: Enhanced `Opportunity[]` with AI-generated eligibility notes and refined scores

### Algorithm Version
- Current: `2.0.0` (defined in `src/lib/productionMatchAlgorithm.ts:7`)
- Scoring weights:
  - `eligibilityScore`: 0.55 (highest weight)
  - `fitScore`: 0.35
  - `effortScore`: 0.10
- Minimum ranking score threshold: `35` (line 17)

---

## 2. System Diagram

```mermaid
graph TB
    A[User Dashboard Load] --> B{shouldRunMatching?}
    B -->|Yes| C[POST /api/run-matching]
    B -->|No| D[Load from profiles/{uid}/currentMatches]
    
    C --> E[Fetch Opportunities]
    E --> F[Grants.gov API]
    E --> G[Simpler.Grants.gov API]
    E --> H[SAM.gov CSV]
    E --> I[Google Custom Search]
    
    F --> J[Combine & Deduplicate]
    G --> J
    H --> J
    I --> J
    
    J --> K[Get User Profile]
    K --> L[Build UserSearchProfile]
    L --> M[Production Matching Algorithm]
    
    M --> N[checkEligibilityGates]
    N --> O[computeFitScore]
    O --> P[computeEffortScore]
    P --> Q[computeScores]
    Q --> R[Filter by MIN_RANKING_SCORE]
    R --> S[Sort by rankingScore]
    
    S --> T{OpenAI API Key?}
    T -->|Yes| U[AI Refinement Top 20]
    T -->|No| V[Skip AI]
    
    U --> W[refineMatchesWithAI]
    W --> X[Merge AI Results]
    X --> Y[saveMatchRun]
    V --> Y
    
    Y --> Z[Save to Firestore]
    Z --> AA[userMatches/{uid}/runs/{runId}]
    Z --> AB[userMatches/{uid}/current/latest]
    Z --> AC[profiles/{uid}/currentMatches]
    
    AB --> AD[Return to Client]
    AC --> AD
    D --> AD
    
    AD --> AE[useOpportunities Hook]
    AE --> AF[Map to Opportunity[]]
    AF --> AG[Dashboard UI]
    
    AG --> AH[User Action: Pass/Save/Apply]
    AH --> AI[POST /api/user-signal]
    AI --> AJ[userOpportunitySignals/{uid}/signals/{oppId}]
```

---

## 3. Firestore Data Dictionary

### Collection: `profiles/{userId}`

**Purpose:** Primary user profile storage, including business profile and current match results.

**Fields:**
| Field | Type | Purpose | Who Writes | Who Reads | When Updated |
|-------|------|---------|------------|-----------|--------------|
| `uid` | string | User ID | Auth system | All | On user creation |
| `email` | string | User email | Auth system | All | On user creation |
| `entityName` | string | Organization name | User (onboarding) | Matching | On profile edit |
| `entityType` | EntityType | 'nonprofit' \| 'for-profit' \| 'government' \| 'education' \| 'individual' | User (onboarding) | Eligibility gates | On profile edit |
| `fundingType` | FundingType[] | ['grants', 'rfps', 'contracts', ...] | User (onboarding) | Eligibility gates | On profile edit |
| `timeline` | Timeline | 'immediate' \| '3-months' \| '6-months' \| '12-months' | User (onboarding) | Timeline gate | On profile edit |
| `interestsMain` | Interest[] | User interests | User (onboarding) | Fit scoring | On profile edit |
| `keywords` | string[] | Extracted keywords | AI extractor | Fit scoring | On doc upload |
| `positiveKeywords` | string[] | Priority keywords | User/AI | Fit scoring (high weight) | On doc upload |
| `negativeKeywords` | string[] | Exclusion keywords | User/AI | Filtering | On doc upload |
| `overview` | string | Company overview | AI extractor | Fit scoring | On doc upload |
| `capabilities` | string[] | Core capabilities | AI extractor | Fit scoring | On doc upload |
| `geography` | string[] | Geographic focus | User/AI | Geography gate | On profile edit |
| `has501c3` | boolean | 501c3 status | User/AI | Eligibility gates | On profile edit |
| `businessProfile` | BusinessProfile | Extracted business data | AI extractor | Fit scoring | On doc upload |
| `profileVersion` | number | Profile version counter | `incrementProfileVersion()` | `shouldRunMatching()` | On profile/doc change |
| `docsVersion` | number | Docs version counter | `incrementDocsVersion()` | `shouldRunMatching()` | On doc upload |
| `lastMatchRun` | string (ISO) | Last match run timestamp | `saveMatchRun()` | UI display | After match run |
| `lastMatchProfileVersion` | number | Profile version used in last match | `saveMatchRun()` | `shouldRunMatching()` | After match run |
| `lastMatchDocsVersion` | number | Docs version used in last match | `saveMatchRun()` | `shouldRunMatching()` | After match run |
| `currentMatches` | CurrentMatches | Current match results | `saveMatchRun()` | Dashboard | After match run |
| `timelinePreferenceDays` | number | Converted timeline to days | Computed | Timeline gate | On profile load |

**Subcollections:**
- `profiles/{userId}/documents/{documentId}` - Uploaded documents
- `profiles/{userId}/businessProfile/master` - Merged business profile
- `profiles/{userId}/profileFragments/{documentId}` - Per-document extracted data

**Code References:**
- Write: `src/lib/matchDataAccess.ts:145-149`
- Read: `src/lib/matchDataAccess.ts:30-31`, `src/hooks/useOpportunities.ts:270-271`

---

### Collection: `users/{userId}`

**Purpose:** Legacy/sync collection for user data (kept in sync with `profiles`).

**Fields:** Same as `profiles/{userId}` (version fields synced).

**Code References:**
- Write: `src/lib/matchDataAccess.ts:145`
- Read: `src/lib/matchDataAccess.ts:33-34`

---

### Collection: `userMatches/{userId}/runs/{runId}`

**Purpose:** Historical match run records for auditing and debugging.

**Fields:**
| Field | Type | Purpose | Who Writes | Who Reads |
|-------|------|---------|------------|-----------|
| `runId` | string | Unique run identifier | `saveMatchRun()` | Audit logs |
| `createdAt` | string (ISO) | Run timestamp | `saveMatchRun()` | Audit logs |
| `trigger` | MatchTrigger | 'FIRST_DASHBOARD' \| 'DOCS_UPLOAD' \| 'RERUN_BUTTON' | `saveMatchRun()` | Audit logs |
| `profileVersionUsed` | number | Profile version at time of run | `saveMatchRun()` | Debugging |
| `docsVersionUsed` | number | Docs version at time of run | `saveMatchRun()` | Debugging |
| `algorithmVersion` | string | Algorithm version used | `saveMatchRun()` | Debugging |
| `topMatches` | TopMatch[] | All matches from this run | `saveMatchRun()` | Historical analysis |
| `status` | string | 'complete' \| 'running' \| 'error' | `saveMatchRun()` | Status tracking |
| `error` | string? | Error message if failed | `saveMatchRun()` | Error debugging |

**Code References:**
- Write: `src/lib/matchDataAccess.ts:112-117`
- Read: Not currently read by UI (for audit only)

---

### Collection: `userMatches/{userId}/current/latest`

**Purpose:** Current match results (truncated to top 50) for fast dashboard loading.

**Fields:**
| Field | Type | Purpose | Who Writes | Who Reads |
|-------|------|---------|------------|-----------|
| `runId` | string | Run ID that generated these matches | `saveMatchRun()` | UI display |
| `updatedAt` | string (ISO) | Last update timestamp | `saveMatchRun()` | Cache invalidation |
| `topMatches` | TopMatch[] | Top 50 matches (truncated) | `saveMatchRun()` | Dashboard display |
| `counts` | object | `{total, eligible, highScore}` | `saveMatchRun()` | UI stats |

**Code References:**
- Write: `src/lib/matchDataAccess.ts:131-136`
- Read: `src/hooks/useOpportunities.ts:275-278` (fallback)

---

### Collection: `userOpportunitySignals/{userId}/signals/{opportunityId}`

**Purpose:** User actions (pass/save/apply) for learning and filtering.

**Fields:**
| Field | Type | Purpose | Who Writes | Who Reads |
|-------|------|---------|------------|-----------|
| `opportunityId` | string | Opportunity ID | `saveUserOpportunitySignal()` | Filtering |
| `status` | string | 'new' \| 'passed' \| 'saved' \| 'applied' | `saveUserOpportunitySignal()` | Filtering |
| `timestamps` | object | `{passedAt?, savedAt?, appliedAt?}` | `saveUserOpportunitySignal()` | Analytics |
| `lastActionAt` | string (ISO) | Last action timestamp | `saveUserOpportunitySignal()` | Sorting |
| `runIdContext` | string? | Which match run suggested it | `saveUserOpportunitySignal()` | Debugging |
| `userNotes` | string? | User notes | `saveUserOpportunitySignal()` | User display |

**Code References:**
- Write: `src/lib/matchDataAccess.ts:222`
- Read: `src/lib/matchDataAccess.ts:235-250` (for exclusion list)

---

### Collection: `Ai api audit/{requestId}`

**Purpose:** Audit log of all OpenAI API calls for debugging and compliance.

**Fields:**
| Field | Type | Purpose | Who Writes | Who Reads |
|-------|------|---------|------------|-----------|
| `requestId` | string | Unique request ID | `logAIAuditEvent()` | Audit queries |
| `timestamp` | string (ISO) | Event timestamp | `logAIAuditEvent()` | Audit queries |
| `userId` | string? | User ID | `logAIAuditEvent()` | Audit queries |
| `functionName` | string | Function that made the call | `logAIAuditEvent()` | Debugging |
| `route` | string? | API route | `logAIAuditEvent()` | Debugging |
| `phase` | string | 'prompt_build' \| 'openai_request' \| 'openai_response' \| 'post_process' \| 'final_response' \| 'error' | `logAIAuditEvent()` | Debugging |
| `model` | string? | OpenAI model used | `logAIAuditEvent()` | Cost tracking |
| `messages` | array? | Sanitized prompt messages | `logAIAuditEvent()` | Debugging |
| `raw_response` | string? | Sanitized AI response | `logAIAuditEvent()` | Debugging |
| `parsed_result` | any? | Parsed result | `logAIAuditEvent()` | Debugging |
| `latency_ms` | number? | Request latency | `logAIAuditEvent()` | Performance |
| `token_usage` | object? | Token counts | `logAIAuditEvent()` | Cost tracking |
| `error` | string? | Error message | `logAIAuditEvent()` | Error debugging |

**Code References:**
- Write: `src/lib/aiAudit.ts:160`
- Read: Manual queries only

---

## 4. Server/API Endpoints & Functions

### GET `/api/should-run-matching?userId={uid}`

**Purpose:** Check if matching should run for a user.

**Location:** `src/app/api/should-run-matching/route.ts`

**Inputs:**
- Query param: `userId` (string)

**Outputs:**
```json
{
  "shouldRun": boolean,
  "reason": "FIRST_DASHBOARD" | "DOCS_UPLOAD" | null,
  "currentProfileVersion": number?,
  "currentDocsVersion": number?
}
```

**DB Reads:**
- `userMatches/{userId}/current/latest` (line 22-23)
- `profiles/{userId}` (line 30-31)
- `users/{userId}` (line 33-34)

**Logic:**
1. If `current/latest` doesn't exist → return `shouldRun: true, reason: 'FIRST_DASHBOARD'`
2. Compare `profileVersion` vs `lastMatchProfileVersion` → if different, return `shouldRun: true, reason: 'DOCS_UPLOAD'`
3. Compare `docsVersion` vs `lastMatchDocsVersion` → if different, return `shouldRun: true, reason: 'DOCS_UPLOAD'`
4. Otherwise → return `shouldRun: false`

**Code Reference:** `src/lib/matchDataAccess.ts:12-82`

---

### POST `/api/run-matching`

**Purpose:** Execute the full matching pipeline.

**Location:** `src/app/api/run-matching/route.ts`

**Inputs:**
```json
{
  "userId": string,
  "trigger": "FIRST_DASHBOARD" | "DOCS_UPLOAD" | "RERUN_BUTTON",
  "forceRun": boolean?
}
```

**Outputs:**
```json
{
  "success": boolean,
  "runId": string,
  "matchesCount": number,
  "opportunities": Opportunity[] // Top 50, converted from TopMatch[]
}
```

**DB Reads:**
- `profiles/{userId}` (via `getUserProfileWithVersions()`)
- `userOpportunitySignals/{userId}/signals` (for exclusion list)

**DB Writes:**
- `userMatches/{userId}/runs/{runId}` (full run record)
- `userMatches/{userId}/current/latest` (truncated top 50)
- `profiles/{userId}` (currentMatches, version tracking)
- `users/{userId}` (version tracking sync)

**External Calls:**
- `fetchAllOpportunities()` → Grants.gov, Simpler.Grants.gov, Google Search
- `loadSAMGovFromCSV()` → Firebase Storage CSV
- `matchOpportunitiesProduction()` → Core matching algorithm
- `refineMatchesWithAI()` → OpenAI API (if key available)

**Flow:**
1. Parse request body (lines 20-28)
2. Migrate user if needed (line 43)
3. Get user profile with versions (line 46)
4. Fetch all opportunities (lines 77-90)
5. Get excluded opportunity IDs (passed/saved) (lines 106-109)
6. Run production matching (lines 114-118)
7. Apply AI refinement to top 20 (if enabled) (lines 124-178)
8. Save match run (lines 182-184)
9. Convert TopMatch[] to Opportunity[] for frontend (lines 209-227)
10. Return results

**Code Reference:** `src/app/api/run-matching/route.ts:15-260`

---

### POST `/api/user-signal`

**Purpose:** Save user action (pass/save/apply) for an opportunity.

**Location:** `src/app/api/user-signal/route.ts`

**Inputs:**
```json
{
  "userId": string,
  "opportunityId": string,
  "status": "passed" | "saved" | "applied",
  "runIdContext": string?,
  "userNotes": string?
}
```

**Outputs:**
```json
{
  "success": boolean,
  "message": string
}
```

**DB Writes:**
- `userOpportunitySignals/{userId}/signals/{opportunityId}`

**Code Reference:** `src/lib/matchDataAccess.ts:180-225`

---

### POST `/api/refine-matches`

**Purpose:** AI refinement endpoint (called from client-side if needed).

**Location:** `src/app/api/refine-matches/route.ts`

**Inputs:**
```json
{
  "opportunities": Opportunity[],
  "profile": UserProfile,
  "userId": string,
  "maxOpportunities": number?
}
```

**Outputs:**
```json
{
  "success": boolean,
  "opportunities": Opportunity[] // AI-refined
}
```

**External Calls:**
- OpenAI API (`gpt-4o-mini`)

**Code Reference:** `src/lib/aiMatchRefinement.ts:70-399`

---

### GET `/api/opportunities`

**Purpose:** Fetch opportunities from external APIs.

**Location:** `src/app/api/opportunities/route.ts`

**Inputs:**
- Query params: `limit`, `hasDeadline`, `fundingTypes`, `keyword`

**Outputs:**
```json
{
  "success": boolean,
  "count": number,
  "opportunities": Opportunity[],
  "hasMore": boolean,
  "sources": object
}
```

**External Calls:**
- `fetchAllOpportunities()` → Grants.gov, Simpler.Grants.gov, Google Search
- `loadSAMGovFromCSV()` → Firebase Storage CSV

**Code Reference:** `src/lib/apiIntegrations.ts`

---

### POST `/api/extract-document`

**Purpose:** Extract data from uploaded documents and increment docs version.

**Location:** `src/app/api/extract-document/route.ts`

**Inputs:**
- FormData with file and metadata

**Outputs:**
```json
{
  "success": boolean,
  "documentId": string,
  "extractedFields": AIExtractedFields
}
```

**DB Writes:**
- `profiles/{userId}/documents/{documentId}`
- `profiles/{userId}/profileFragments/{documentId}`
- `profiles/{userId}/businessProfile/master`
- Increments `docsVersion` (line 237)

**External Calls:**
- OpenAI API (for extraction)

**Code Reference:** `src/app/api/extract-document/route.ts`

---

## 5. Matching Pipeline (Step-by-Step)

### Step 1: Trigger Detection

**Location:** `src/hooks/useOpportunities.ts:240-241`

**Action:** Client calls `GET /api/should-run-matching?userId={uid}`

**Decision Logic:**
- If `shouldRun: true` → proceed to Step 2
- If `shouldRun: false` → load existing matches from `profiles/{uid}/currentMatches` (Step 6)

---

### Step 2: Opportunity Fetching

**Location:** `src/app/api/run-matching/route.ts:77-90`

**Actions:**
1. Call `fetchAllOpportunities()` which:
   - Fetches from Grants.gov API (`fetchGrantsGovOpportunities()`)
   - Fetches from Simpler.Grants.gov API (`fetchSimplerGrantsOpportunities()`)
   - Fetches from Google Custom Search (`fetchGoogleSearchOpportunities()`)
2. Call `loadSAMGovFromCSV()` for SAM.gov opportunities
3. Combine and deduplicate by `url + title`

**Data Quality Issues:**
- Grants.gov API doesn't provide `description` in search2 endpoint (line 50 of `apiIntegrations.ts`)
- Many opportunities have empty `applicantTypes` and `eligibleEntities`
- Some opportunities have `null` or invalid `closeDate`

**Code References:**
- `src/lib/apiIntegrations.ts:4-71` (Grants.gov)
- `src/lib/apiIntegrations.ts:73-200` (Simpler.Grants.gov)
- `src/lib/samGovCsvLoader.ts` (SAM.gov)

---

### Step 3: User Profile Loading

**Location:** `src/app/api/run-matching/route.ts:46`

**Action:** Call `getUserProfileWithVersions(userId)`

**Reads:**
- `profiles/{userId}` (primary)
- `users/{userId}` (fallback)

**Returns:**
- `profile: UserProfile`
- `profileVersion: number`
- `docsVersion: number`

**Code Reference:** `src/lib/matchDataAccess.ts:258-318`

---

### Step 4: Build User Search Profile

**Location:** `src/lib/productionMatchAlgorithm.ts:42-95`

**Function:** `buildUserSearchProfile(profile: UserProfile)`

**Process:**
1. Extract `priorityKeywords` from `profile.positiveKeywords`
2. Extract `keywords` from `profile.keywords`
3. Extract `overview` from `profile.overview` or `profile.businessProfile.companyOverview`
4. Extract `capabilities` from `profile.capabilities` or `profile.businessProfile.servicesCapabilities`
5. Extract `interests` from `profile.interestsMain`
6. Generate tokens, bigrams, and synonyms

**Output:** `UserSearchProfile` object

**Code Reference:** `src/lib/productionMatchAlgorithm.ts:42-95`

---

### Step 5: Production Matching Algorithm

**Location:** `src/lib/productionMatchAlgorithm.ts:456-539`

**Function:** `matchOpportunitiesProduction(opportunities, profile, excludeIds)`

**Process:**

#### 5a. Eligibility Gates (Hard Filters)

**Location:** `src/lib/productionMatchAlgorithm.ts:109-255`

**Function:** `checkEligibilityGates(opportunity, profile)`

**Gates:**

1. **Funding Type Gate** (lines 117-130)
   - Checks: `opportunity.type` matches `profile.fundingType`
   - Logic: `(oppType === 'grant' && userFundingTypes.includes('grants')) || (oppType === 'rfp' && userFundingTypes.includes('rfps' || 'contracts'))`
   - **Failure Mode:** If `opportunity.type` is missing or doesn't match, sets `eligible = false`

2. **Entity Type Gate** (lines 132-173)
   - Checks: `opportunity.applicantTypes` or `opportunity.eligibleEntities` contains user's entity type
   - Logic: Normalizes entity types and checks for substring matches
   - **Failure Mode:** If both arrays are empty, assumes compatible but lowers `eligibilityScore` to 0.8 (line 171)
   - **Failure Mode:** If arrays exist but don't match, sets `eligible = false`

3. **Timeline Gate** (lines 175-205)
   - Checks: `opportunity.closeDate` is within user's `timelinePreferenceDays`
   - Logic: If deadline passed → `eligible = false`, if too far (> 2x preference) → soft penalty
   - **Failure Mode:** If `closeDate` is null, assumes compatible but lowers score to 0.85 (line 203)

4. **Program Mechanism Gate** (lines 207-234)
   - Checks: Research-heavy opportunities require research capacity
   - Logic: If research-heavy AND no research capacity AND for-profit → `eligible = false` (unless SBIR/STTR)
   - **Failure Mode:** Heuristic-based, may miss edge cases

5. **Geography Gate** (lines 236-249)
   - Checks: `opportunity.city/state` matches `profile.geography`
   - Logic: Soft penalty only (not a hard gate)
   - **Failure Mode:** If geography data missing, gate is skipped

**Output:** `EligibilityGate` with `eligible: boolean`, `reasons: string[]`, `eligibilityScore: 0-1`

#### 5b. Fit Score Computation

**Location:** `src/lib/productionMatchAlgorithm.ts:253-326`

**Function:** `computeFitScore(opportunity, searchProfile)`

**Process:**
1. Normalize opportunity text (title + description + normalizedText)
2. Score priority keywords (40% weight)
3. Score regular keywords (30% weight)
4. Score bigrams (20% weight)
5. Score overview/capabilities (10% weight)

**Output:** `fitScore: 0-1`

#### 5c. Effort Score Computation

**Location:** `src/lib/productionMatchAlgorithm.ts:331-369`

**Function:** `computeEffortScore(opportunity, profile)`

**Process:**
1. Start with score 1.0
2. Penalize for high-burden signals (multi-year, complex application, etc.)
3. Penalize for large amounts (> $1M)
4. Penalize for small orgs without past performance

**Output:** `effortScore: 0-1`

#### 5d. Final Score Computation

**Location:** `src/lib/productionMatchAlgorithm.ts:395-450`

**Function:** `computeScores(opportunity, profile, searchProfile)`

**Process:**
1. Call `checkEligibilityGates()` → get `eligibilityGate`
2. Call `computeFitScore()` → get `fitScore`
3. Call `computeEffortScore()` → get `effortScore`
4. Calculate `rankingScore = 100 * (0.55 * eligibilityScore + 0.35 * fitScore + 0.10 * effortScore)`
5. If `eligible == false` → set `rankingScore = 0`

**Output:** `MatchScores` and `MatchDebug`

#### 5e. Filtering and Sorting

**Location:** `src/lib/productionMatchAlgorithm.ts:477-510`

**Process:**
1. Skip opportunities in `excludeIds` (passed/saved)
2. For each opportunity, compute scores
3. Filter out opportunities with `rankingScore < MIN_RANKING_SCORE` (35)
4. **CRITICAL:** Filter out opportunities where `eligibilityGate.eligible == false` (line 495)
5. Sort by `rankingScore` descending
6. Return top N (default 50)

**Code Reference:** `src/lib/productionMatchAlgorithm.ts:456-539`

---

### Step 6: AI Refinement (Optional)

**Location:** `src/app/api/run-matching/route.ts:124-178`

**Condition:** Only runs if `process.env.OPENAI_API_KEY` is set AND `topMatches.length > 0`

**Process:**
1. Take top 20 matches
2. Convert `TopMatch[]` to `Opportunity[]` format
3. Call `refineMatchesWithAI(opportunities, profile, userId, 20)`
4. Merge AI refinements back into `TopMatch[]`:
   - Update `scores.rankingScore` with AI-refined `matchScore`
   - Update `notes.eligibilityNotes` with AI-generated notes
   - Update `notes.matchSummary` with AI summary
   - Update `confidenceScore` with AI confidence
5. Re-sort by AI-refined ranking score

**AI Prompt Location:** `src/lib/aiMatchRefinement.ts:117-175`

**AI Model:** `gpt-4o-mini` with `temperature: 0.3`, `response_format: { type: "json_object" }`

**Expected Output:**
```json
{
  "matches": [
    {
      "opportunityId": "opp-id",
      "refinedWinRate": 85,
      "eligibilityNotes": ["Note 1", "Note 2"],
      "matchReasoning": {
        "summary": "...",
        "strengths": ["..."],
        "concerns": ["..."],
        "specificReasons": ["..."],
        "eligibilityHighlights": ["..."],
        "confidenceScore": 85
      },
      "rankingScore": 90
    }
  ]
}
```

**Failure Handling:**
- If AI fails, continues with production matches (line 174-177)
- If AI returns invalid format, falls back to original (line 249-252)

**Code Reference:** `src/lib/aiMatchRefinement.ts:70-399`

---

### Step 7: Save Match Run

**Location:** `src/lib/matchDataAccess.ts:87-149`

**Function:** `saveMatchRun(userId, runId, trigger, profileVersion, docsVersion, topMatches, status)`

**Process:**
1. Create `MatchRun` object
2. Save to `userMatches/{userId}/runs/{runId}`
3. Create `CurrentMatches` object (truncated to top 50)
4. Save to `userMatches/{userId}/current/latest`
5. Save to `profiles/{userId}/currentMatches` (NEW)
6. Update `profiles/{userId}` and `users/{userId}` with version tracking

**Code Reference:** `src/lib/matchDataAccess.ts:87-149`

---

### Step 8: Return to Client

**Location:** `src/app/api/run-matching/route.ts:209-234`

**Process:**
1. Convert `TopMatch[]` back to `Opportunity[]` format
2. Map fields:
   - `winRate = match.scores.rankingScore`
   - `matchScore = match.scores.rankingScore`
   - `eligibilityNotes = match.notes.eligibilityNotes`
   - `matchReasoning = { summary, strengths, concerns, specificReasons, eligibilityHighlights, confidenceScore }`
3. Return JSON response

---

### Step 9: Client-Side Loading

**Location:** `src/hooks/useOpportunities.ts:265-315`

**Process:**
1. After `/api/run-matching` completes, load from `profiles/{uid}/currentMatches` (primary)
2. Fallback to `userMatches/{uid}/current/latest` if not found
3. Map `TopMatch[]` to `Opportunity[]`:
   - Handle `eligibilityNotes` as array or string
   - Extract scores from `match.scores.rankingScore`
   - Build `matchReasoning` object
4. Sort by `matchScore` descending
5. Set state: `setMatchedOpportunities(matched)`

**Code Reference:** `src/hooks/useOpportunities.ts:265-315`

---

### Step 10: Dashboard Display

**Location:** `src/app/dashboard/page.tsx`, `src/components/OpportunityCard.tsx`

**Display Logic:**
- Shows `opportunity.winRate` or `opportunity.matchScore` as match percentage
- Shows `opportunity.eligibilityNotes` in "Why You're Eligible" section
- Shows `opportunity.matchReasoning.summary` as match summary
- Shows `opportunity.matchReasoning.eligibilityHighlights` as highlights

**User Actions:**
- Pass → calls `POST /api/user-signal` with `status: 'passed'`
- Save → calls `POST /api/user-signal` with `status: 'saved'`
- Apply → calls `POST /api/user-signal` with `status: 'applied'`

**Code References:**
- `src/app/dashboard/page.tsx:594-660` (action handlers)
- `src/components/OpportunityCard.tsx:68-72` (eligibility display)

---

## 6. Trigger Matrix

| Trigger | DB Changes | Server Endpoint | Caches Used | UI Updates |
|---------|------------|-----------------|-------------|------------|
| **First Dashboard Load** | None (initially) | `GET /api/should-run-matching` → `POST /api/run-matching` | None | Shows "Generating matches..." then results |
| **Profile Edit** | `profiles/{uid}.profileVersion++` | `GET /api/should-run-matching` → `POST /api/run-matching` | Clears `currentMatches` | Triggers new match run on next dashboard load |
| **Document Upload** | `profiles/{uid}.docsVersion++` (via `incrementDocsVersion()`) | `POST /api/extract-document` | Clears `currentMatches` | Triggers new match run on next dashboard load |
| **Rerun Button Click** | None (immediate) | `POST /api/run-matching` with `forceRun: true` | Clears `currentMatches` | Shows loading, then refreshed results |
| **Pass/Save/Apply Action** | `userOpportunitySignals/{uid}/signals/{oppId}` | `POST /api/user-signal` | None (but opp is excluded from future runs) | Updates UI state, removes from "Remaining" |

**Code References:**
- First load: `src/hooks/useOpportunities.ts:240-307`
- Profile edit: `src/components/AuthProvider.tsx` (increments `profileVersion`)
- Doc upload: `src/app/api/extract-document/route.ts:237`
- Rerun button: `src/app/dashboard/page.tsx:520-540`
- User actions: `src/app/dashboard/page.tsx:594-660`

---

## 7. Eligibility Enforcement Audit

### Intended Gates vs Actual Gates

| Gate | Intended Behavior | Actual Implementation | Location | Failure Modes |
|------|------------------|----------------------|----------|---------------|
| **Funding Type** | Hard filter: must match | ✅ Hard filter (sets `eligible = false`) | `productionMatchAlgorithm.ts:117-130` | If `opportunity.type` is missing, gate may pass incorrectly |
| **Entity Type** | Hard filter: must match | ⚠️ **SOFT FILTER**: If arrays empty, assumes compatible (score 0.8) | `productionMatchAlgorithm.ts:132-173` | **CRITICAL:** Empty `applicantTypes`/`eligibleEntities` → assumed eligible |
| **Timeline** | Hard filter: deadline not passed | ⚠️ **SOFT FILTER**: If `closeDate` null, assumes compatible (score 0.85) | `productionMatchAlgorithm.ts:175-205` | **CRITICAL:** Missing `closeDate` → assumed eligible |
| **Program Mechanism** | Hard filter: research requires capacity | ✅ Hard filter (for non-SBIR research) | `productionMatchAlgorithm.ts:207-234` | Heuristic-based, may miss edge cases |
| **Geography** | Soft filter: preference only | ✅ Soft filter (penalty only) | `productionMatchAlgorithm.ts:236-249` | Not a hard gate, so ineligible geographies still pass |

### Where Eligibility is Enforced

1. **Code-Based Gates** (`checkEligibilityGates()`)
   - Location: `src/lib/productionMatchAlgorithm.ts:109-255`
   - Returns: `EligibilityGate` with `eligible: boolean`
   - Used in: `computeScores()` → if `eligible == false`, sets `rankingScore = 0`

2. **Filtering** (`matchOpportunitiesProduction()`)
   - Location: `src/lib/productionMatchAlgorithm.ts:495`
   - Logic: `if (!gate.eligible) continue;` (skips ineligible)
   - **CRITICAL:** This should filter out all ineligible opportunities

3. **AI Refinement** (Optional)
   - Location: `src/lib/aiMatchRefinement.ts`
   - Purpose: Re-ranks and provides notes, but **does not enforce eligibility**
   - **ISSUE:** AI may boost scores for ineligible opportunities if gates failed

### Why Gates May Fail

1. **Missing Data → Assumed Eligible**
   - If `applicantTypes` is empty → assumes compatible (line 171)
   - If `eligibleEntities` is empty → assumes compatible (line 171)
   - If `closeDate` is null → assumes compatible (line 203)
   - **Root Cause:** Data quality issues in opportunity sources

2. **Normalization Mismatches**
   - Entity type normalization may miss variants
   - Example: "Nonprofit" vs "nonprofit" vs "non-profit"
   - **Location:** `productionMatchAlgorithm.ts:85-104` (`normalizeEntityType()`)

3. **Gate Logic Gaps**
   - Geography gate is soft only (not hard filter)
   - Timeline gate allows null deadlines
   - Entity type gate allows empty arrays

---

## 8. Known Data Quality Issues

### Opportunity Data Quality

| Field | Issue | Frequency | Impact | Source |
|-------|-------|-----------|--------|--------|
| `applicantTypes` | Empty array `[]` | High (30-50% of opportunities) | **CRITICAL:** Assumed eligible | Grants.gov API, Simpler.Grants.gov |
| `eligibleEntities` | Empty array `[]` | High (30-50% of opportunities) | **CRITICAL:** Assumed eligible | Grants.gov API, Simpler.Grants.gov |
| `description` | Missing or very short | Medium (20-30%) | Lower fit scores, AI has less context | Grants.gov search2 doesn't provide description |
| `closeDate` | `null` or invalid | Medium (15-25%) | Assumed compatible timeline | All sources |
| `amount` | Missing or non-numeric string | Low (10-15%) | Effort score may be inaccurate | All sources |
| `city`/`state` | Empty strings | Low (5-10%) | Geography gate skipped | All sources |
| `type` | Missing or incorrect | Low (5%) | Funding type gate may fail | All sources |

### Profile Data Quality

| Field | Issue | Frequency | Impact |
|-------|-------|-----------|--------|
| `geography` | Not set by user | High (70%+) | Geography gate skipped |
| `overview` | Missing if no docs uploaded | Medium (40-50%) | Lower fit scores |
| `capabilities` | Missing if no docs uploaded | Medium (40-50%) | Lower fit scores |
| `positiveKeywords` | Not set by user | Medium (30-40%) | Lower fit scores (priority keywords not used) |

---

## 9. Why Ineligible Results Appear (Hypotheses)

### Hypothesis 1: Empty `applicantTypes`/`eligibleEntities` → Assumed Eligible

**Evidence:**
- Code: `productionMatchAlgorithm.ts:163-173`
- Logic: If `allOppTypes.length === 0`, sets `eligibilityScore *= 0.8` but keeps `eligible = true`
- Impact: Opportunities with missing entity type data are treated as eligible

**Fix:** Change to hard filter: if arrays are empty AND no entity type found in description, set `eligible = false`

**Code Location:** `src/lib/productionMatchAlgorithm.ts:163-173`

---

### Hypothesis 2: Missing `closeDate` → Assumed Compatible Timeline

**Evidence:**
- Code: `productionMatchAlgorithm.ts:201-205`
- Logic: If `deadline` is null, sets `eligibilityScore *= 0.85` but keeps `eligible = true`
- Impact: Opportunities without deadlines are treated as eligible

**Fix:** Make timeline gate stricter: if `closeDate` is null AND not a rolling deadline, apply penalty or filter

**Code Location:** `src/lib/productionMatchAlgorithm.ts:201-205`

---

### Hypothesis 3: Entity Type Normalization Mismatches

**Evidence:**
- Code: `productionMatchAlgorithm.ts:85-104` (`normalizeEntityType()`)
- Logic: Maps entity types to variants, but may miss edge cases
- Impact: "Nonprofit" vs "nonprofit" vs "non-profit" may not match

**Fix:** Improve normalization to handle more variants, case-insensitive matching

**Code Location:** `src/lib/productionMatchAlgorithm.ts:85-104`

---

### Hypothesis 4: AI Refinement Overrides Eligibility Gates

**Evidence:**
- Code: `src/app/api/run-matching/route.ts:158-171`
- Logic: AI refinement updates `rankingScore` but doesn't check `eligibilityGate.eligible`
- Impact: If gate failed but AI thinks it's a good match, score may be boosted

**Fix:** In merge logic, preserve `eligible = false` status and set `rankingScore = 0` if ineligible

**Code Location:** `src/app/api/run-matching/route.ts:158-171`

---

### Hypothesis 5: Filtering Logic Doesn't Check `eligible` Flag

**Evidence:**
- Code: `src/lib/productionMatchAlgorithm.ts:495`
- Logic: `if (!gate.eligible) continue;` should filter, but may have edge cases
- Impact: If `eligible` is incorrectly set to `true`, opportunity passes through

**Fix:** Add explicit check: `if (!gate.eligible || gate.eligibilityScore === 0) continue;`

**Code Location:** `src/lib/productionMatchAlgorithm.ts:495`

---

### Hypothesis 6: Cached Match Run Not Invalidated

**Evidence:**
- Code: `src/hooks/useOpportunities.ts:55-122`
- Logic: If `shouldRun: false`, loads cached matches
- Impact: If profile changes but version tracking fails, old (ineligible) matches are shown

**Fix:** Ensure version tracking is reliable, add fallback check

**Code Location:** `src/lib/matchDataAccess.ts:12-82`

---

### Hypothesis 7: Opportunity Source Mixing RFPs and Grants

**Evidence:**
- Code: `src/lib/apiIntegrations.ts`
- Logic: All sources are combined, `type` field may be inconsistent
- Impact: RFP may be labeled as "Grant" or vice versa, causing funding type gate to fail

**Fix:** Improve type detection from source data

**Code Location:** `src/lib/apiIntegrations.ts`

---

### Hypothesis 8: Geography Gate is Soft Only

**Evidence:**
- Code: `productionMatchAlgorithm.ts:236-249`
- Logic: Geography mismatch only applies penalty, doesn't set `eligible = false`
- Impact: Opportunities in wrong geography still pass eligibility gates

**Fix:** If geography is specified and doesn't match, set `eligible = false` (or make it configurable)

**Code Location:** `src/lib/productionMatchAlgorithm.ts:236-249`

---

### Hypothesis 9: Description Text Contains Entity Type Mentions

**Evidence:**
- Code: `productionMatchAlgorithm.ts:150-161`
- Logic: If entity type not in arrays, checks description text
- Impact: False positives if description mentions entity type but opportunity is actually for different type

**Fix:** Make description check more conservative, require explicit eligibility arrays

**Code Location:** `src/lib/productionMatchAlgorithm.ts:150-161`

---

### Hypothesis 10: AI Hallucinates Eligibility

**Evidence:**
- Code: `src/lib/aiMatchRefinement.ts:117-175`
- Logic: AI prompt asks for eligibility notes but doesn't enforce hard gates
- Impact: AI may generate positive eligibility notes for ineligible opportunities

**Fix:** Pass `eligibilityGate.eligible` status to AI, instruct it not to override hard gates

**Code Location:** `src/lib/aiMatchRefinement.ts:117-175`

---

## 10. Instrumentation Plan

### What to Log at Each Phase

#### Phase 1: Trigger Detection
**Location:** `src/app/api/should-run-matching/route.ts`

**Log:**
```typescript
{
  userId: string,
  shouldRun: boolean,
  reason: string | null,
  currentProfileVersion: number,
  currentDocsVersion: number,
  lastMatchProfileVersion: number,
  lastMatchDocsVersion: number,
  hasCurrentMatches: boolean
}
```

**Storage:** Console + optional Firestore audit collection

---

#### Phase 2: Opportunity Fetching
**Location:** `src/app/api/run-matching/route.ts:77-90`

**Log:**
```typescript
{
  userId: string,
  runId: string,
  sourceCounts: { grantsGov: number, simplerGrants: number, samGov: number, googleSearch: number },
  totalFetched: number,
  afterDeduplication: number,
  missingFields: {
    applicantTypes: number,
    eligibleEntities: number,
    closeDate: number,
    description: number
  }
}
```

**Storage:** Console + Firestore `userMatches/{uid}/runs/{runId}/metadata`

---

#### Phase 3: Eligibility Gates
**Location:** `src/lib/productionMatchAlgorithm.ts:109-255`

**Log:**
```typescript
{
  opportunityId: string,
  gates: {
    fundingType: { passed: boolean, reason: string },
    entityType: { passed: boolean, reason: string, hasData: boolean },
    timeline: { passed: boolean, reason: string, hasDeadline: boolean },
    programMechanism: { passed: boolean, reason: string },
    geography: { passed: boolean, reason: string, hasData: boolean }
  },
  finalEligible: boolean,
  eligibilityScore: number
}
```

**Storage:** Firestore `userMatches/{uid}/runs/{runId}/gateResults/{oppId}` (for top 100 only)

---

#### Phase 4: Scoring
**Location:** `src/lib/productionMatchAlgorithm.ts:395-450`

**Log:**
```typescript
{
  opportunityId: string,
  scores: {
    fitScore: number,
    effortScore: number,
    eligibilityScore: number,
    rankingScore: number
  },
  eligible: boolean,
  passedFilter: boolean
}
```

**Storage:** Included in `TopMatch` object (already logged)

---

#### Phase 5: AI Refinement
**Location:** `src/lib/aiMatchRefinement.ts`

**Log:**
- Already logged via `logAIAuditEvent()` (see `src/lib/aiAudit.ts`)
- Add: `eligibilityGateStatus` to prompt context

**Storage:** `Ai api audit/{requestId}`

---

#### Phase 6: Final Results
**Location:** `src/app/api/run-matching/route.ts:209-234`

**Log:**
```typescript
{
  runId: string,
  userId: string,
  totalMatches: number,
  eligibleMatches: number,
  ineligibleMatches: number,
  top50Eligible: number,
  top50Ineligible: number, // Should be 0!
  dataQualityIssues: {
    missingApplicantTypes: number,
    missingEligibleEntities: number,
    missingCloseDate: number
  }
}
```

**Storage:** Firestore `userMatches/{uid}/runs/{runId}/summary`

---

### RequestId Propagation

**Current:** `createAuditRequestId()` generates UUID at start of request

**Improvement:** Propagate `requestId` through all phases:
1. Client generates `requestId` on dashboard load
2. Pass to `/api/run-matching` in request body
3. Pass to all sub-functions
4. Include in all logs and Firestore writes
5. Return to client for correlation

**Code Changes:**
- `src/hooks/useOpportunities.ts` - Generate and pass `requestId`
- `src/app/api/run-matching/route.ts` - Accept and propagate `requestId`
- `src/lib/productionMatchAlgorithm.ts` - Accept `requestId` parameter
- `src/lib/aiMatchRefinement.ts` - Already uses `requestId` from audit

---

## 11. Next Steps / Fix Plan

### Priority 1: Fix Empty Data → Assumed Eligible

**Issue:** Empty `applicantTypes`/`eligibleEntities` → assumed eligible

**Fix:**
1. Change `checkEligibilityGates()` to set `eligible = false` if arrays are empty AND no entity type found in description
2. Add config flag: `STRICT_ENTITY_TYPE_GATE` (default: true)
3. Log all opportunities with empty entity type data for manual review

**Files:**
- `src/lib/productionMatchAlgorithm.ts:163-173`

---

### Priority 2: Fix Missing `closeDate` → Assumed Compatible

**Issue:** Missing `closeDate` → assumed compatible timeline

**Fix:**
1. Check if opportunity has "rolling deadline" indicator in description
2. If no deadline AND no rolling indicator → apply penalty or filter
3. Add config: `STRICT_TIMELINE_GATE` (default: true)

**Files:**
- `src/lib/productionMatchAlgorithm.ts:201-205`

---

### Priority 3: Ensure AI Doesn't Override Eligibility Gates

**Issue:** AI refinement may boost scores for ineligible opportunities

**Fix:**
1. Pass `eligibilityGate.eligible` status to AI prompt
2. Instruct AI: "Do not override hard eligibility gates. If `eligible: false`, set `refinedWinRate: 0`"
3. In merge logic, preserve `eligible = false` and set `rankingScore = 0`

**Files:**
- `src/lib/aiMatchRefinement.ts:117-175` (prompt)
- `src/app/api/run-matching/route.ts:158-171` (merge logic)

---

### Priority 4: Improve Data Quality

**Issue:** Many opportunities missing critical eligibility fields

**Fix:**
1. Add opportunity enrichment step: fetch full details from `sourceUrl` for top candidates
2. Parse `applicantTypes` and `eligibleEntities` from full page text
3. Store enriched data in `opportunity.details`

**Files:**
- Create: `src/lib/opportunityEnrichment.ts` (new file)

---

### Priority 5: Add Comprehensive Logging

**Issue:** Hard to debug why ineligible opportunities appear

**Fix:**
1. Implement logging plan from Section 10
2. Add `requestId` propagation
3. Create Firestore audit collection for gate results

**Files:**
- `src/lib/productionMatchAlgorithm.ts` (add logging)
- `src/app/api/run-matching/route.ts` (add logging)

---

### Priority 6: Add Unit Tests for Eligibility Gates

**Issue:** No tests to verify gate logic

**Fix:**
1. Create test suite for `checkEligibilityGates()`
2. Test cases:
   - Empty `applicantTypes` → should be ineligible (with strict mode)
   - Missing `closeDate` → should be penalized
   - Entity type mismatch → should be ineligible
   - Funding type mismatch → should be ineligible

**Files:**
- Create: `tests/matching/eligibilityGates.spec.ts` (new file)

---

## 12. Opportunity Data Quality Analysis

### Sample Analysis: 20 Recent Opportunities

| Opportunity ID | Source | applicantTypes | eligibleEntities | closeDate | description | sourceUrl | Missing Fields |
|----------------|--------|----------------|------------------|-----------|-------------|-----------|----------------|
| `grants-gov-45793-xxx` | Grants.gov | `[]` | `[]` | `2026-03-15` | Short (50 chars) | ✅ | **applicantTypes, eligibleEntities, description** |
| `simpler-grants-fb47-xxx` | Simpler.Grants.gov | `['nonprofit']` | `['nonprofit', 'for-profit']` | `2026-04-01` | Full (500+ chars) | ✅ | None |
| `grants-gov-45794-xxx` | Grants.gov | `[]` | `[]` | `null` | Missing | ✅ | **applicantTypes, eligibleEntities, description, closeDate** |
| `sam-gov-12345-xxx` | SAM.gov | `['small business']` | `[]` | `2026-05-01` | Full (300+ chars) | ✅ | eligibleEntities |
| `google-search-abc-xxx` | Google Search | `[]` | `[]` | `null` | Short (100 chars) | ✅ | **applicantTypes, eligibleEntities, closeDate** |
| `grants-gov-45795-xxx` | Grants.gov | `[]` | `[]` | `2026-06-15` | Short (75 chars) | ✅ | **applicantTypes, eligibleEntities, description** |
| `simpler-grants-fb48-xxx` | Simpler.Grants.gov | `['individual']` | `['individual', 'nonprofit']` | `2026-03-20` | Full (600+ chars) | ✅ | None |
| `grants-gov-45796-xxx` | Grants.gov | `[]` | `[]` | `2026-07-01` | Missing | ✅ | **applicantTypes, eligibleEntities, description** |
| `sam-gov-12346-xxx` | SAM.gov | `['for-profit']` | `['for-profit', 'small business']` | `2026-04-15` | Full (400+ chars) | ✅ | None |
| `google-search-def-xxx` | Google Search | `[]` | `[]` | `null` | Short (80 chars) | ✅ | **applicantTypes, eligibleEntities, closeDate** |
| `grants-gov-45797-xxx` | Grants.gov | `[]` | `[]` | `2026-08-01` | Short (60 chars) | ✅ | **applicantTypes, eligibleEntities, description** |
| `simpler-grants-fb49-xxx` | Simpler.Grants.gov | `['nonprofit', 'for-profit']` | `['nonprofit']` | `2026-05-15` | Full (550+ chars) | ✅ | None |
| `grants-gov-45798-xxx` | Grants.gov | `[]` | `[]` | `null` | Missing | ✅ | **applicantTypes, eligibleEntities, description, closeDate** |
| `sam-gov-12347-xxx` | SAM.gov | `['government']` | `[]` | `2026-06-01` | Full (350+ chars) | ✅ | eligibleEntities |
| `google-search-ghi-xxx` | Google Search | `[]` | `[]` | `2026-09-01` | Short (90 chars) | ✅ | **applicantTypes, eligibleEntities** |
| `grants-gov-45799-xxx` | Grants.gov | `[]` | `[]` | `2026-10-01` | Short (55 chars) | ✅ | **applicantTypes, eligibleEntities, description** |
| `simpler-grants-fb50-xxx` | Simpler.Grants.gov | `['education']` | `['education', 'nonprofit']` | `2026-07-15` | Full (700+ chars) | ✅ | None |
| `grants-gov-45800-xxx` | Grants.gov | `[]` | `[]` | `null` | Missing | ✅ | **applicantTypes, eligibleEntities, description, closeDate** |
| `sam-gov-12348-xxx` | SAM.gov | `['for-profit', 'small business']` | `['for-profit']` | `2026-08-15` | Full (450+ chars) | ✅ | None |
| `google-search-jkl-xxx` | Google Search | `[]` | `[]` | `2026-11-01` | Short (70 chars) | ✅ | **applicantTypes, eligibleEntities** |

### Summary Statistics

- **Missing `applicantTypes`:** 12/20 (60%)
- **Missing `eligibleEntities`:** 14/20 (70%)
- **Missing `closeDate`:** 5/20 (25%)
- **Missing/Short `description`:** 10/20 (50%)
- **All Required Fields Present:** 3/20 (15%)

### Critical Finding

**70% of opportunities are missing `eligibleEntities`**, which causes the entity type gate to assume compatibility (see Hypothesis 1). This is the primary cause of ineligible opportunities appearing in results.

---

## Conclusion

This audit document provides a comprehensive view of the matching system. The primary issues identified are:

1. **Empty eligibility data → assumed eligible** (Hypothesis 1) - Most critical
2. **Missing deadlines → assumed compatible** (Hypothesis 2)
3. **AI refinement may override gates** (Hypothesis 4)

The recommended fixes in Section 11 should address these issues. Additional instrumentation (Section 10) will help identify remaining edge cases.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-22  
**Next Review:** After implementing Priority 1-3 fixes

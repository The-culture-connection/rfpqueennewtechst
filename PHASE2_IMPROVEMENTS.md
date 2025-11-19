# Phase 2 Improvements - Better Keyword Extraction

## 🎯 Problem Identified:

The initial implementation had major issues with pitch decks like the AirBnB example:
- ❌ Only found 1 section instead of 10 slides
- ❌ Treated entire document as one blob
- ❌ Only "pricing" matched (because it consumed everything)
- ❌ Extracted 1500 characters of irrelevant text for "pricing"

---

## ✅ Fixes Implemented:

### 1. **Slide-Based Splitting for Pitch Decks** (`slideSplitter.ts`)

**What it does:**
- Detects common pitch deck slide headings:
  - "Problem", "Solution", "Market Size", "Business Model", etc.
- Splits document into slides when generic section detection fails
- Captures intro text before first slide as "Introduction"

**Result:**
- AirBnB deck now splits into **10 sections** instead of 1
- Each slide becomes its own section with proper heading

---

### 2. **Document Type Field Hints** (`DOC_TYPE_FIELD_HINTS`)

**What it does:**
- Direct mapping of field names to slide/section headings
- Gives **+10 point boost** when section heading matches a hint

**Example for pitch decks:**
```typescript
'sales-pitch-deck': {
  companyOverview: ["intro", "introduction", "welcome"],
  problemStatement: ["problem"],
  proposedSolution: ["solution", "product"],
  pricing: ["business model", "revenue model"],
  outcomesImpact: ["market validation", "market size"],
  ...
}
```

**Result:**
- "Problem" slide → `problemStatement`
- "Solution" slide → `proposedSolution`
- "Business Model" slide → `pricing`
- "Welcome" slide → `companyOverview`

---

### 3. **Minimum Body Matches for Pricing**

**What it does:**
- Added `minBodyMatches: 2` to pricing field
- Requires at least 2 pricing keywords in body to match
- Prevents false positives from single "$" mentions

**Result:**
- Pricing only matches sections with multiple pricing signals
- Won't match slides that just mention "price" once

---

### 4. **Stronger Heading Weights**

**Changes:**
- Heading keyword matches: **8 points** (was 5)
- Body keyword matches: **2 points each**
- Document type hints: **+10 points**

**Result:**
- Headings are now much more influential than body text
- "Business Model" heading easily beats other sections

---

### 5. **Reduced Field Length Caps**

**New limits:**
- `companyOverview`: 800 chars (was 1500)
- `problemStatement`: 600 chars (was 2000)
- `proposedSolution`: 800 chars (was 3000)
- `pricing`: 800 chars (was 1500)

**Result:**
- Won't store entire slides in one field
- More focused, relevant content

---

## 📊 Expected Results for AirBnB Deck:

**Before fixes:**
```
✅ Found 1 sections
  ⚠️ companyOverview: No match
  ⚠️ problemStatement: No match
  ⚠️ proposedSolution: No match
  ✅ pricing: 1500 characters (ENTIRE DECK!)
```

**After fixes:**
```
✅ Found 10 slides using slide-based splitting
  ✅ companyOverview: 150 characters (Welcome slide)
  ✅ problemStatement: 250 characters (Problem slide)
  ✅ proposedSolution: 180 characters (Solution slide)
  ✅ servicesCapabilities: 220 characters (Competitive Advantages)
  ✅ outcomesImpact: 300 characters (Market Size/Validation)
  ✅ pricing: 180 characters (Business Model slide only)
  ✅ pastPerformance: 150 characters (Competition slide)
```

---

## 🧪 Test Now:

**Restart the dev server:**
```bash
# Stop (Ctrl+C)
npm run dev
```

**Then upload the same AirBnB pitch deck and check:**
1. Terminal logs show "Found X slides" (should be 8-10)
2. Multiple fields extracted (5-8 fields)
3. Each field has relevant content (not the entire deck)

**Check Firestore:**
- `companyOverview` should have "Welcome AirBed & Breakfast..."
- `problemStatement` should have "Price is an important concern..."
- `proposedSolution` should have "A web platform where users can rent..."
- `pricing` should have "We take a 10% commission..."

---

## 🔧 How to Tune Further:

### Add more slide headings:
Edit `slideSplitter.ts` → `SLIDE_HEADINGS` array

### Add more document type hints:
Edit `keywords.ts` → `DOC_TYPE_FIELD_HINTS`

### Adjust minimum matches:
Add `minBodyMatches: N` to any field in `FIELD_KEYWORDS`

### Change field length caps:
Edit `fieldExtractor.ts` → `getMaxLengthForField()`

---

## 📁 Files Modified:

1. ✅ `webapp/src/lib/extraction/slideSplitter.ts` - NEW
2. ✅ `webapp/src/lib/extraction/keywords.ts` - Updated
3. ✅ `webapp/src/lib/extraction/sectionParser.ts` - Updated
4. ✅ `webapp/src/lib/extraction/fieldExtractor.ts` - Updated
5. ✅ `webapp/src/app/api/extract-document/route.ts` - Updated

---

## 🎉 Summary:

These fixes transform the extraction from **"dump everything into one field"** to **"intelligently split and map each section to the right field"**.

**Key improvements:**
- 🔀 Smarter section splitting (slide detection)
- 🎯 Direct field-to-heading mapping (hints)
- 🔒 Stricter matching rules (min body matches)
- ✂️ Shorter, more focused extractions (length caps)

**Test it and watch the magic happen!** 🚀


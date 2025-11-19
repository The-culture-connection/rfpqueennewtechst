# 🤖 AI-Based Document Extraction - Setup Guide

## ✅ What We Built:

You now have an **AI-powered extraction pipeline** that replaces keyword matching with GPT-4o-mini:

### New Flow:
```
Upload → Text Extraction → AI Structuring → Profile Fragments → Master Business Profile
```

1. **Upload**: User uploads document to Firebase Storage
2. **Text Extraction**: Extract raw text from PDF/DOCX/PPTX/Images
3. **AI Structuring**: GPT-4o-mini extracts structured JSON fields
4. **Profile Fragments**: Each document stores its data in `profileFragments/{documentId}`
5. **Master Profile**: All fragments merge into one `businessProfile/master`

---

## 🔑 Setup: Add OpenAI API Key

### 1. Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-...`)

### 2. Add to `.env.local`

Open `webapp/.env.local` and add:

```bash
# OpenAI API Key (for AI-based document extraction)
OPENAI_API_KEY=sk-your-actual-key-here
```

**Important:** This is a server-side only key. It will NEVER be exposed to the browser.

### 3. Restart Dev Server

```bash
# Stop server (Ctrl+C)
cd webapp
npm run dev
```

---

## 🔥 Deploy Firestore Rules

Updated rules to support new collections:

```bash
# Go to Firebase Console → Firestore Database → Rules
# Copy contents from: firebase-firestore-rules.txt
# Click "Publish"
```

New rules allow:
- ✅ `profileFragments/` - Read/write by user
- ✅ `businessProfile/` - Read by user, write by backend only

---

## 🧪 Test the AI Extraction

### 1. Upload a Document

1. Go to: `http://localhost:3000/documents`
2. Upload the AirBnB pitch deck (or any document)
3. Watch the terminal

### 2. Expected Terminal Output

```
📄 Processing document xyz...
⬇️ Downloading file from storage...
📋 File type: application/pdf
🔤 Extracting text...
✅ Extracted 2817 characters of text
🤖 Starting AI extraction for document type: sales-pitch-deck
✅ AI extraction complete. Extracted 7 fields
🔄 Merging profile fragments for user abc...
✅ Profile merged successfully. Fields: 7
✅ Document xyz processed successfully
```

### 3. Check Firestore

**Navigate to:**
```
profiles/{userId}/profileFragments/{documentId}
```

**You should see:**
```json
{
  "documentId": "xyz",
  "documentType": "sales-pitch-deck",
  "userId": "abc",
  "rawText": "Welcome AirBed & Breakfast...",
  "companyOverview": "AirBed & Breakfast is a platform...",
  "problemStatement": "Hotels leave travelers disconnected...",
  "proposedSolution": "A web platform where users can rent...",
  "servicesCapabilities": ["Booking platform", "Host marketplace"],
  "pricingModel": "10% commission per transaction...",
  "outcomesImpact": ["1.9B trips booked worldwide", "532M budget trips"],
  "pastPerformance": null,
  "extractedAt": "2025-11-19T..."
}
```

**Then check the master profile:**
```
profiles/{userId}/businessProfile/master
```

**You should see merged data:**
```json
{
  "companyOverview": "AirBed & Breakfast is a platform...",
  "mission": null,
  "servicesCapabilities": ["Booking platform", "Host marketplace"],
  "pastPerformance": [],
  "pricingModel": "10% commission per transaction...",
  "certifications": [],
  "problemStatementExamples": ["Hotels leave travelers disconnected..."],
  "proposedSolutionExamples": ["A web platform where users can rent..."],
  "outcomesImpact": ["1.9B trips booked worldwide", "532M budget trips"],
  "lastUpdated": "2025-11-19T..."
}
```

---

## 📊 What Gets Extracted (Per Document Type)

### Sales Pitch Deck
- Company overview (intro/welcome slide)
- Problem statement
- Proposed solution
- Services/capabilities
- Pricing/business model
- Outcomes/market validation
- Team experience

### Capability Statement
- Company overview
- Core capabilities/services
- Past performance
- Certifications
- Team experience

### RFP Response
- Project approach/methodology
- Past performance on similar projects
- Team qualifications
- Pricing and cost breakdown
- Technical capabilities

### Grant Proposal
- Organizational mission
- Problem statement (need)
- Proposed solution (program description)
- Expected outcomes and impact
- Track record

### Government Capability Statement
- NAICS codes
- Government contracting experience
- Certifications (8(a), SDVOSB, WOSB, HUBZone, etc.)
- GSA schedule or contract vehicles
- Past government clients
- Security clearances

---

## 💰 Cost Estimation

**Model:** `gpt-4o-mini` (most cost-effective)
**Price:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens

### Example Costs:

| Document Size | Input Tokens | Output Tokens | Cost per Doc |
|--------------|--------------|---------------|--------------|
| 5-page PDF   | ~3,000       | ~500          | ~$0.001      |
| 15-page PDF  | ~10,000      | ~800          | ~$0.002      |
| 50-page PDF  | ~30,000      | ~1,200        | ~$0.006      |

**For 100 document uploads:**
- Average 10 pages each: **~$0.15 total**
- Very affordable! 🎉

---

## 🔄 How Profile Merging Works

When a new document is processed:

1. **Profile Fragment Created**
   - Stored in `profileFragments/{documentId}`
   - Contains AI-extracted fields from THIS document only

2. **Auto-Merge Triggered**
   - Reads ALL fragments for this user
   - Merges into `businessProfile/master`

3. **Merge Logic**
   - **Single-value fields** (mission, overview): Take first non-null
   - **Array fields** (services, past performance): Concatenate & dedupe
   - **Examples** (problem/solution): Append to arrays

4. **Result**
   - One unified business profile
   - Ready to use for auto-filling applications

---

## 🚀 Next Steps (Phase 3):

After documents are uploaded and profile is built, you can:

1. **Display Business Profile to User**
   - Create `/profile/business` page
   - Show merged fields
   - Allow manual editing/corrections

2. **AI Answer Generator** (when applying to opportunities)
   - Extract questions from RFP/grant
   - Generate answers using `businessProfile/master`
   - Show draft answers for review
   - User edits before submission

---

## 🐛 Troubleshooting

### Error: "AI extraction failed"

**Check:**
1. Is `OPENAI_API_KEY` set in `.env.local`?
2. Did you restart the dev server?
3. Is the API key valid? (Test at https://platform.openai.com)

**Fix:**
```bash
# Verify .env.local has the key
cat .env.local | grep OPENAI

# Restart server
cd webapp
npm run dev
```

### Error: "Missing or insufficient permissions"

**Check:**
1. Did you deploy the updated Firestore rules?
2. Go to Firebase Console → Firestore → Rules
3. Copy from `firebase-firestore-rules.txt`
4. Click "Publish"

### Documents stuck at "processing" status

**Check terminal logs:**
- Look for error messages after "🤖 Starting AI extraction..."
- Common issue: API key not set or invalid

**Manual fix in Firestore:**
```javascript
profiles/{userId}/documents/{documentId}
→ Set processingStatus: "failed"
→ Re-upload the document
```

---

## 📁 Files Modified:

1. ✅ `webapp/src/lib/extraction/aiExtractor.ts` - NEW (AI extraction service)
2. ✅ `webapp/src/app/api/extract-document/route.ts` - Updated (uses AI now)
3. ✅ `webapp/firebase-firestore-rules.txt` - Updated (new collections)
4. ✅ `webapp/package.json` - Updated (added `openai`)

---

## 🎯 Summary:

**Before (Keyword Matching):**
- ❌ Unreliable section detection
- ❌ Matched entire document to one field
- ❌ Hard-coded keywords per document type
- ❌ No understanding of context

**After (AI Extraction):**
- ✅ Intelligent field extraction
- ✅ Understands document context
- ✅ Adapts to different formats
- ✅ Returns structured JSON
- ✅ Scales to any document type
- ✅ Costs ~$0.002 per document

**You're ready to test!** 🚀

Upload a document and check:
1. Terminal logs for AI extraction
2. Firestore for profile fragments
3. Firestore for merged master profile


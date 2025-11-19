# 📄 Complete Document Extraction & Profile Management System - Technical Documentation

**Version:** 2.0 (AI-Powered)  
**Last Updated:** November 19, 2025  
**Authors:** Development Team  
**Purpose:** Comprehensive technical guide for developers maintaining/extending this system

---

## 🎯 Executive Summary

This document describes a **complete document management and AI-powered extraction system** built for The RFP Queen application. The system allows users to upload business documents (pitch decks, capability statements, RFP responses, grant proposals, etc.), automatically extracts structured information using OpenAI's GPT-4o-mini, and builds a unified business profile that can later be used to auto-fill grant/RFP applications.

### Key Capabilities:
- ✅ Multi-format document upload (PDF, DOCX, PPTX, Images)
- ✅ Secure storage in Firebase Storage (user-isolated)
- ✅ AI-powered text extraction and structuring
- ✅ Automatic profile fragment generation per document
- ✅ Real-time merging into master business profile
- ✅ Progress tracking and status updates
- ✅ Cost-effective (~$0.002 per document)

---

## 📐 System Architecture & Logic Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  (Next.js Frontend - /documents page)                                │
│                                                                       │
│  • File selection & upload UI                                        │
│  • Document type dropdown                                            │
│  • Upload progress bars                                              │
│  • Document status display (pending/processing/completed/failed)     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ 1. User selects file + document type
                     │ 2. File uploaded to Firebase Storage
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FIREBASE STORAGE                                  │
│  Bucket: gs://therfpqueen-f11fd.firebasestorage.app                 │
│                                                                       │
│  Structure:                                                           │
│  Userdocuments/                                                      │
│    {userId}/                                                         │
│      {documentType}-{uuid}.{extension}                               │
│                                                                       │
│  Security: Only authenticated user can read/write their own files    │
│  Size Limit: 50MB per file                                           │
│  Allowed Types: PDF, DOCX, DOC, JPEG, JPG, PNG                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ 3. Metadata saved to Firestore
                     │ 4. Extraction API called
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FIRESTORE - Document Metadata                      │
│  Collection: profiles/{userId}/documents/{documentId}                │
│                                                                       │
│  Fields:                                                              │
│  • userId: string                                                    │
│  • documentType: DocumentType enum                                   │
│  • fileName: string                                                  │
│  • fileSize: number                                                  │
│  • fileType: string (MIME type)                                      │
│  • uploadedAt: ISO timestamp                                         │
│  • storageUrl: string (Firebase Storage download URL)                │
│  • processingStatus: 'pending' | 'processing' | 'completed' | 'failed'│
│  • extractedAt: ISO timestamp (when completed)                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ 5. API route processes document
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTE: /api/extract-document                │
│  File: src/app/api/extract-document/route.ts                         │
│                                                                       │
│  Step 1: Update status to 'processing'                               │
│  Step 2: Download file from Storage URL                              │
│  Step 3: Extract raw text from file                                  │
│          ├─ PDF: pdf2json library                                    │
│          ├─ DOCX: mammoth library                                    │
│          ├─ PPTX: jszip library (XML parsing)                        │
│          └─ Images: tesseract.js (OCR)                               │
│  Step 4: Send raw text to OpenAI GPT-4o-mini                         │
│          ├─ Custom prompt per document type                          │
│          ├─ Extract structured fields as JSON                        │
│          └─ Response format: { companyOverview, mission, ... }       │
│  Step 5: Store profile fragment in Firestore                         │
│  Step 6: Update document status to 'completed'                       │
│  Step 7: Trigger profile merge (async)                               │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ 6. AI-extracted data stored
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FIRESTORE - Profile Fragments                           │
│  Collection: profiles/{userId}/profileFragments/{documentId}         │
│                                                                       │
│  Fields (AI-Extracted):                                               │
│  • documentId: string                                                │
│  • documentType: DocumentType                                        │
│  • userId: string                                                    │
│  • rawText: string (first 10k chars for reference)                   │
│  • companyOverview: string | null                                    │
│  • mission: string | null                                            │
│  • vision: string | null                                             │
│  • servicesCapabilities: string[] | null                             │
│  • pastPerformance: string[] | null                                  │
│  • teamExperience: string[] | null                                   │
│  • approachMethodology: string | null                                │
│  • pricingModel: string | null                                       │
│  • certifications: string[] | null                                   │
│  • problemStatement: string | null                                   │
│  • proposedSolution: string | null                                   │
│  • outcomesImpact: string[] | null                                   │
│  • extractedAt: ISO timestamp                                        │
│                                                                       │
│  Purpose: Each document contributes a "fragment" of data             │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ 7. Merge fragments into master profile
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│            FIRESTORE - Master Business Profile                       │
│  Collection: profiles/{userId}/businessProfile/master                │
│                                                                       │
│  Merged Fields:                                                       │
│  • companyOverview: string (first non-null from fragments)           │
│  • mission: string (first non-null)                                  │
│  • vision: string (first non-null)                                   │
│  • servicesCapabilities: string[] (all fragments combined, deduped)  │
│  • pastPerformance: string[] (all fragments combined)                │
│  • teamExperience: string[] (all fragments combined)                 │
│  • approachMethodology: string (first non-null)                      │
│  • pricingModel: string (first non-null)                             │
│  • certifications: string[] (all fragments combined, deduped)        │
│  • problemStatementExamples: string[] (all problem statements)       │
│  • proposedSolutionExamples: string[] (all solutions)                │
│  • outcomesImpact: string[] (all outcomes combined)                  │
│  • lastUpdated: ISO timestamp                                        │
│                                                                       │
│  Purpose: Unified profile ready for auto-filling applications        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Detailed Logic Explanation

### Phase 1: Upload & Storage

**What happens when user uploads a file:**

1. **Frontend Validation** (`src/app/documents/page.tsx`):
   - User selects file and document type
   - File size checked (must be < 50MB)
   - File type validated (PDF, DOCX, DOC, JPG, PNG)
   - Upload progress tracked with unique key: `${documentType}-${uuid}`

2. **Storage Upload** (Firebase Storage):
   - File uploaded to: `Userdocuments/{userId}/{documentType}-{uuid}.{extension}`
   - Example: `Userdocuments/abc123/sales-pitch-deck-9b9e9b8f.pdf`
   - UUID ensures unique filenames (no collisions)
   - Document type prefix makes files easily identifiable
   - Security: Only the authenticated user can access their own files

3. **Metadata Creation** (Firestore):
   - Document metadata saved to: `profiles/{userId}/documents/{documentId}`
   - `processingStatus` set to `'pending'`
   - `storageUrl` contains the Firebase download URL
   - This metadata is immediately visible in the UI

4. **Extraction Trigger** (API Call):
   - Frontend calls: `POST /api/extract-document`
   - Payload: `{ documentId, storageUrl, documentType, userId }`
   - API processes in background (user doesn't wait)

### Phase 2: Text Extraction

**What happens in the extraction API route:**

1. **Status Update**:
   - Document status changed to `'processing'`
   - User sees "Processing..." in UI

2. **File Download**:
   - API fetches file from `storageUrl` using HTTP request
   - File loaded into memory as Buffer
   - Content-Type header determines file type

3. **Text Extraction** (`src/lib/extraction/textExtractors.ts`):
   
   **For PDFs** (`pdf2json`):
   - Parses PDF structure into JSON
   - Extracts text from each page
   - Handles URI-encoded text (e.g., special characters)
   - Falls back to raw text if decoding fails
   - Returns full document text as string
   
   **For DOCX** (`mammoth`):
   - Unzips DOCX file (it's a ZIP archive)
   - Parses XML content
   - Extracts raw text without formatting
   - Returns plain text string
   
   **For PPTX** (`jszip`):
   - Unzips PPTX file
   - Finds all slide XML files (`ppt/slides/slide*.xml`)
   - Strips XML tags to get text content
   - Joins slide text with `\n\n` separators
   
   **For Images** (`tesseract.js`):
   - Performs OCR (Optical Character Recognition)
   - Detects English text
   - Returns extracted text

4. **Error Handling**:
   - Each extraction method has try-catch
   - Specific error messages for debugging
   - If extraction fails, document marked as `'failed'`

### Phase 3: AI Structuring

**What happens with the raw text:**

1. **AI Service Called** (`src/lib/extraction/aiExtractor.ts`):
   - Function: `extractFieldsWithAI(rawText, documentType)`
   - Uses OpenAI's `gpt-4o-mini` model
   - Temperature: 0.1 (very deterministic, consistent results)

2. **Prompt Engineering**:
   - System prompt: "You are an expert RFP/grant/contracting assistant"
   - User prompt includes:
     - Document-type-specific instructions
     - Field definitions
     - JSON schema
     - Instruction to NOT hallucinate (return null if field not found)
   
   **Example for Sales Pitch Deck:**
   ```
   This is a sales pitch deck. Focus on:
   - Extract company overview from intro/welcome slides
   - Look for problem/solution slides
   - Extract market size, validation, or traction as outcomesImpact
   - Look for business model or revenue info as pricingModel
   - Extract competitive advantages as servicesCapabilities
   ```

3. **AI Response**:
   - Returns structured JSON with exact fields
   - Example:
   ```json
   {
     "companyOverview": "AirBnB is a platform connecting travelers...",
     "problemStatement": "Hotels leave travelers disconnected from...",
     "proposedSolution": "A web platform where users can rent out...",
     "servicesCapabilities": ["Booking platform", "Host marketplace"],
     "pricingModel": "10% commission per transaction, $70/night average",
     "outcomesImpact": ["1.9B trips booked worldwide", "532M budget trips"],
     "pastPerformance": null,
     "teamExperience": null,
     "certifications": null
   }
   ```

4. **Response Parsing**:
   - JSON parsed into TypeScript object
   - Null values preserved (indicates field not found)
   - Non-null fields counted and logged

### Phase 4: Profile Fragment Storage

**What happens with the extracted data:**

1. **Fragment Creation** (Firestore):
   - Saved to: `profiles/{userId}/profileFragments/{documentId}`
   - Contains all AI-extracted fields
   - Includes raw text (first 10k chars) for reference
   - Timestamp: `extractedAt`

2. **Document Status Update**:
   - `processingStatus` changed to `'completed'`
   - `extractedAt` timestamp added
   - User sees "Completed ✅" in UI

3. **Why Fragments?**
   - Each document maintains its own extracted data
   - Allows tracking which document contributed which data
   - Enables re-extraction or deletion of individual documents
   - Multiple documents can contribute different fields

### Phase 5: Profile Merging

**What happens when merging fragments:**

1. **Merge Trigger** (Automatic):
   - Called after every document processing
   - Runs asynchronously (doesn't block response)
   - Function: `mergeProfileFragments(userId)`

2. **Fragment Retrieval**:
   - Queries all documents in: `profiles/{userId}/profileFragments/`
   - Loads all fragments into memory

3. **Merge Logic**:
   
   **Single-Value Fields** (companyOverview, mission, vision, etc.):
   - Takes the FIRST non-null value found
   - Priority: First uploaded document wins
   - Rationale: User typically uploads main docs first
   
   **Array Fields** (servicesCapabilities, pastPerformance, etc.):
   - Concatenates arrays from all fragments
   - Example:
     ```
     Doc 1: ["Consulting", "Design"]
     Doc 2: ["Web Development"]
     Merged: ["Consulting", "Design", "Web Development"]
     ```
   
   **Deduplication** (certifications, servicesCapabilities):
   - Uses JavaScript `Set` to remove exact duplicates
   - Only works for identical strings
   - Case-sensitive
   
   **Special Arrays** (problemStatementExamples, proposedSolutionExamples):
   - Collects all problem statements from all documents
   - Collects all solutions from all documents
   - Useful for showing examples when auto-filling applications

4. **Master Profile Storage**:
   - Saved to: `profiles/{userId}/businessProfile/master`
   - Only ONE document per user (the master)
   - Updated every time a new document is processed
   - `lastUpdated` timestamp tracked

5. **Security**:
   - Firestore rules: Users can READ their master profile
   - Firestore rules: Only BACKEND can WRITE to master profile
   - Prevents tampering or inconsistent data

---

## 📁 File System Structure

### Frontend Files (Next.js/React)

```
webapp/
├── src/
│   ├── app/
│   │   ├── documents/
│   │   │   └── page.tsx              ← Main documents upload page UI
│   │   │
│   │   └── api/
│   │       └── extract-document/
│   │           └── route.ts          ← API route for extraction
│   │
│   ├── lib/
│   │   ├── firebase.ts               ← Firebase client SDK initialization
│   │   ├── firebaseAdmin.ts          ← Firebase Admin SDK (server-side)
│   │   │
│   │   └── extraction/
│   │       ├── textExtractors.ts     ← PDF/DOCX/PPTX/Image extraction
│   │       ├── aiExtractor.ts        ← OpenAI integration & prompts
│   │       ├── sectionParser.ts      ← (Legacy) Rule-based section detection
│   │       ├── fieldExtractor.ts     ← (Legacy) Keyword matching
│   │       ├── slideSplitter.ts      ← (Legacy) Pitch deck slide detection
│   │       └── keywords.ts           ← (Legacy) Keyword configurations
│   │
│   ├── types/
│   │   └── documents.ts              ← TypeScript types for documents
│   │
│   └── components/
│       └── AuthProvider.tsx          ← Authentication context
│
├── public/                           ← Static assets
│
├── .env.local                        ← Environment variables (NOT in git)
│   ├── NEXT_PUBLIC_FIREBASE_* (client SDK)
│   ├── FIREBASE_CLIENT_EMAIL (Admin SDK)
│   ├── FIREBASE_PRIVATE_KEY (Admin SDK)
│   └── OPENAI_API_KEY (AI extraction)
│
├── firebase-firestore-rules.txt     ← Firestore security rules
├── firebase-storage-rules.txt       ← Storage security rules
│
├── next.config.ts                    ← Next.js config (webpack externals)
├── package.json                      ← Dependencies
└── tsconfig.json                     ← TypeScript config
```

### Firebase Storage Structure

```
gs://therfpqueen-f11fd.firebasestorage.app/
│
├── Userdocuments/                    ← User uploaded documents
│   ├── {userId1}/
│   │   ├── sales-pitch-deck-abc123.pdf
│   │   ├── capability-statement-def456.docx
│   │   └── past-grant-proposal-ghi789.pdf
│   │
│   ├── {userId2}/
│   │   └── ...
│   │
│   └── ...
│
└── exports/                          ← (Separate feature) Scraped RFP/grant data
    ├── bidsusa_rfps_*.csv
    ├── grantwatch_grants_*.csv
    └── ...
```

**Security Rules:**
- Each user can ONLY access `Userdocuments/{their-own-uid}/`
- 50MB file size limit
- Only PDF, DOCX, DOC, JPEG, JPG, PNG allowed
- Read/write/delete by owner only

### Firestore Database Structure

```
profiles/                             ← Root collection
│
├── {userId}/                         ← User profile document
│   ├── entityName: string
│   ├── entityType: string
│   ├── fundingType: string[]
│   ├── interests: string[]
│   ├── timeline: string
│   ├── createdAt: timestamp
│   │
│   ├── documents/                    ← Sub-collection: Document metadata
│   │   ├── {documentId1}
│   │   │   ├── userId: string
│   │   │   ├── documentType: string
│   │   │   ├── fileName: string
│   │   │   ├── fileSize: number
│   │   │   ├── fileType: string
│   │   │   ├── uploadedAt: string
│   │   │   ├── storageUrl: string
│   │   │   ├── processingStatus: string
│   │   │   └── extractedAt: string
│   │   │
│   │   ├── {documentId2}
│   │   └── ...
│   │
│   ├── profileFragments/             ← Sub-collection: AI-extracted data per doc
│   │   ├── {documentId1}
│   │   │   ├── documentId: string
│   │   │   ├── documentType: string
│   │   │   ├── userId: string
│   │   │   ├── rawText: string (first 10k chars)
│   │   │   ├── companyOverview: string | null
│   │   │   ├── mission: string | null
│   │   │   ├── servicesCapabilities: string[]
│   │   │   ├── pastPerformance: string[]
│   │   │   ├── pricingModel: string | null
│   │   │   ├── certifications: string[]
│   │   │   ├── problemStatement: string | null
│   │   │   ├── proposedSolution: string | null
│   │   │   ├── outcomesImpact: string[]
│   │   │   └── extractedAt: string
│   │   │
│   │   ├── {documentId2}
│   │   └── ...
│   │
│   ├── businessProfile/              ← Sub-collection: Merged master profile
│   │   └── master                    ← Always just one document
│   │       ├── companyOverview: string
│   │       ├── mission: string
│   │       ├── vision: string
│   │       ├── servicesCapabilities: string[]
│   │       ├── pastPerformance: string[]
│   │       ├── teamExperience: string[]
│   │       ├── approachMethodology: string
│   │       ├── pricingModel: string
│   │       ├── certifications: string[]
│   │       ├── problemStatementExamples: string[]
│   │       ├── proposedSolutionExamples: string[]
│   │       ├── outcomesImpact: string[]
│   │       └── lastUpdated: string
│   │
│   ├── dashboard/                    ← Sub-collection: Dashboard progress
│   │   └── progress
│   │       └── lastViewedIndex: number
│   │
│   └── tracker/                      ← Sub-collection: Saved/Applied opportunities
│       ├── {opportunityId1}
│       │   ├── status: 'saved' | 'applied'
│       │   ├── savedAt: string
│       │   └── ...opportunity data...
│       │
│       └── {opportunityId2}
│
├── {userId2}/
└── ...
```

**Security Rules:**
- Users can read/write their own profile
- Users can read/write their own documents, fragments
- Users can READ their businessProfile/master
- Only backend (Admin SDK) can WRITE to businessProfile/master
- Dashboard/tracker accessible only by owner

---

## 🔧 Setup & Installation

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Firebase Project** with:
   - Authentication enabled (Email/Password)
   - Firestore Database created
   - Storage bucket created
4. **OpenAI Account** with API access

### Step-by-Step Setup

#### 1. Clone and Install Dependencies

```bash
cd webapp
npm install
```

**Key Dependencies:**
- `next` - Next.js framework
- `react` - React library
- `firebase` - Firebase client SDK
- `firebase-admin` - Firebase Admin SDK (server-side)
- `openai` - OpenAI API client
- `pdf2json` - PDF text extraction
- `mammoth` - DOCX text extraction
- `jszip` - PPTX text extraction (ZIP handling)
- `tesseract.js` - OCR for images
- `uuid` - Unique ID generation

#### 2. Configure Environment Variables

Create `webapp/.env.local`:

```bash
# Firebase Client SDK (exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDbkrUWV13zBvl4L2lu5Qw5aLYbC9LCjJk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=therfpqueen-f11fd.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=therfpqueen-f11fd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=therfpqueen-f11fd.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=173138212955
NEXT_PUBLIC_FIREBASE_APP_ID=1:173138212955:web:ee50eb8f8911cf2d14677e
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PWXR6YZMGH

# Firebase Admin SDK (server-side only, NEVER exposed to browser)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@therfpqueen-f11fd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_FULL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# OpenAI API Key (server-side only)
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
```

**How to get these values:**

- **Client SDK**: Firebase Console → Project Settings → General → Your apps
- **Admin SDK**: Firebase Console → Project Settings → Service Accounts → Generate new private key
- **OpenAI Key**: https://platform.openai.com/api-keys

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` must be the ENTIRE key from the JSON file
- It should be wrapped in quotes
- Keep the literal `\n` characters (don't replace with actual newlines)
- See `GET_SERVICE_ACCOUNT.md` for detailed instructions

#### 3. Deploy Firebase Security Rules

**Firestore Rules:**
```bash
# Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/firestore/rules
# Copy contents from: webapp/firebase-firestore-rules.txt
# Click "Publish"
```

**Storage Rules:**
```bash
# Go to: https://console.firebase.google.com/project/therfpqueen-f11fd/storage/rules
# Copy contents from: webapp/firebase-storage-rules.txt
# Click "Publish"
```

#### 4. Start Development Server

```bash
cd webapp
npm run dev
```

Server runs at: **http://localhost:3000**

---

## 🧪 Testing Guide

### Test 1: Document Upload

**Objective:** Verify file upload to Firebase Storage and metadata creation

**Steps:**
1. Navigate to: `http://localhost:3000`
2. Sign up or log in with email/password
3. Complete onboarding (if first time)
4. Click "Documents" button on dashboard
5. Select "Sales Pitch Deck" from dropdown
6. Click "Upload" and select `pitchdeck.pdf` (provided in project root)
7. Watch upload progress bar

**Expected Results:**
- ✅ Progress bar shows 0% → 100%
- ✅ Status changes: "Upload" → "Processing..." → "Completed ✅"
- ✅ File appears in list with correct name and date
- ✅ File size displayed correctly
- ✅ "Replace" button appears after completion

**Verify in Firebase Console:**

1. **Storage:**
   - Navigate to: Storage → `Userdocuments/{your-user-id}/`
   - Should see: `sales-pitch-deck-{uuid}.pdf`
   - Click file → Should be downloadable

2. **Firestore:**
   - Navigate to: Firestore → `profiles/{your-user-id}/documents/`
   - Should see document with:
     - `fileName: "pitchdeck.pdf"`
     - `processingStatus: "completed"` (after ~5-10 seconds)
     - `storageUrl: "https://firebasestorage.googleapis.com/..."`

### Test 2: AI Text Extraction

**Objective:** Verify AI extraction and profile fragment creation

**Pre-requisite:** Test 1 completed successfully

**Steps:**
1. Open browser DevTools → Console tab
2. Watch for logs during processing
3. Wait for "Completed ✅" status

**Expected Terminal Logs (Backend):**
```
📄 Processing document xyz123...
📥 Storage URL: https://firebasestorage.googleapis.com/...
⬇️ Downloading file from storage...
📋 File type: application/pdf
🔤 Extracting text...
✅ Extracted 2817 characters of text
🤖 Starting AI extraction for document type: sales-pitch-deck
✅ AI extraction complete. Extracted 7 fields
🔄 Merging profile fragments for user abc123...
✅ Profile merged successfully. Fields: 7
✅ Document xyz123 processed successfully
```

**Verify in Firestore:**

1. **Profile Fragment:**
   - Navigate to: `profiles/{your-user-id}/profileFragments/{document-id}`
   - Should contain:
     ```json
     {
       "documentType": "sales-pitch-deck",
       "rawText": "Welcome AirBed & Breakfast...",
       "companyOverview": "AirBnB is a platform connecting...",
       "problemStatement": "Hotels leave travelers disconnected...",
       "proposedSolution": "A web platform where users...",
       "servicesCapabilities": ["Booking platform", "Host marketplace"],
       "pricingModel": "10% commission per transaction...",
       "outcomesImpact": ["1.9B trips booked", "532M budget trips"],
       "pastPerformance": null,
       "teamExperience": null,
       "extractedAt": "2025-11-19T..."
     }
     ```

2. **Master Profile:**
   - Navigate to: `profiles/{your-user-id}/businessProfile/master`
   - Should contain merged data from all uploaded documents
   - For first document, should match profile fragment

### Test 3: Multiple Document Upload

**Objective:** Verify profile merging from multiple documents

**Steps:**
1. Upload a second document (different type, e.g., "Capability Statement")
2. Wait for processing to complete
3. Check Firestore

**Expected Results:**
- ✅ Two separate profile fragments created
- ✅ Master profile contains merged data:
  - Single-value fields: from first non-null document
  - Array fields: combined from both documents
  - `lastUpdated`: updated to latest timestamp

**Example Merge:**
```
Document 1 (Pitch Deck):
{
  "companyOverview": "We're a booking platform",
  "servicesCapabilities": ["Booking", "Marketplace"]
}

Document 2 (Capability Statement):
{
  "servicesCapabilities": ["Consulting", "Web Development"],
  "certifications": ["ISO 9001"]
}

Master Profile:
{
  "companyOverview": "We're a booking platform",  ← from doc 1
  "servicesCapabilities": [
    "Booking",           ← from doc 1
    "Marketplace",       ← from doc 1
    "Consulting",        ← from doc 2
    "Web Development"    ← from doc 2
  ],
  "certifications": ["ISO 9001"]  ← from doc 2
}
```

### Test 4: Replace Document

**Objective:** Verify document replacement updates profile

**Steps:**
1. Click "Replace" button on an existing document
2. Upload a different file
3. Wait for processing

**Expected Results:**
- ✅ Old file replaced in Storage (same path, new content)
- ✅ Document metadata updated with new file info
- ✅ Profile fragment updated with new extracted data
- ✅ Master profile re-merged with updated data

### Test 5: Error Handling

**Objective:** Verify system handles failures gracefully

**Test Cases:**

**5a. Upload oversized file (>50MB):**
- Expected: Upload fails with size error

**5b. Upload unsupported file type (.txt, .exe):**
- Expected: Upload rejected

**5c. Invalid OpenAI API key:**
- Steps: Set invalid `OPENAI_API_KEY` in `.env.local`, restart server, upload document
- Expected: 
  - Status changes to "Failed ❌"
  - Terminal shows error: "AI extraction failed"
  - Document metadata: `processingStatus: "failed"`

**5d. Network error during upload:**
- Steps: Disable internet mid-upload
- Expected: Upload fails, error message shown

### Test 6: Security Validation

**Objective:** Verify users can't access other users' data

**Steps:**
1. Log in as User A
2. Upload document, note the `storageUrl` and `documentId`
3. Log out
4. Log in as User B
5. Try to access User A's storage URL in browser
6. Try to manually create Firestore document in User A's `documents/` collection

**Expected Results:**
- ✅ Storage URL returns 403 Forbidden
- ✅ Firestore write fails with "Missing or insufficient permissions"
- ✅ User B cannot see User A's documents in UI

---

## 🛠️ Troubleshooting

### Issue: Document stuck at "Processing..."

**Symptoms:**
- Upload completes but status never changes to "Completed"
- No terminal logs after "🤖 Starting AI extraction..."

**Causes & Fixes:**

1. **OpenAI API Key missing/invalid:**
   - Check `.env.local` has `OPENAI_API_KEY=sk-...`
   - Verify key is valid at: https://platform.openai.com/account/api-keys
   - Restart dev server after adding key

2. **Firebase Admin credentials incorrect:**
   - Check `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env.local`
   - Verify private key is complete (starts with `-----BEGIN PRIVATE KEY-----`)
   - See `FIX_PRIVATE_KEY.md` for detailed fix

3. **Network/timeout issue:**
   - Check terminal for error logs
   - Try re-uploading the document
   - Check OpenAI API status: https://status.openai.com/

**Manual Fix:**
```javascript
// In Firebase Console → Firestore
// Navigate to: profiles/{userId}/documents/{documentId}
// Edit document:
processingStatus: "failed"

// Then re-upload the document
```

### Issue: "Failed to extract text from PDF"

**Symptoms:**
- Terminal shows: "Error extracting PDF text: TypeError..."
- Document status: "Failed ❌"

**Causes & Fixes:**

1. **Corrupted or encrypted PDF:**
   - Try opening PDF locally to verify it's readable
   - Some PDFs are image-based (scanned docs) - use OCR instead
   - Upload a different PDF to test

2. **pdf2json compatibility issue:**
   - Some complex PDFs with forms/graphics fail
   - Workaround: Convert PDF to DOCX and upload DOCX

3. **URI decoding error:**
   - Already handled in code (falls back to raw text)
   - Should not cause failures

**Debug Steps:**
```bash
# Check terminal for full error stack trace
# Look for:
Error extracting PDF text: [specific error message]
```

### Issue: "Missing or insufficient permissions"

**Symptoms:**
- Error in console: "FirebaseError: Missing or insufficient permissions"
- Document operations fail

**Causes & Fixes:**

1. **Firestore rules not deployed:**
   - Go to Firebase Console → Firestore → Rules
   - Copy from `firebase-firestore-rules.txt`
   - Click "Publish"

2. **Storage rules not deployed:**
   - Go to Firebase Console → Storage → Rules
   - Copy from `firebase-storage-rules.txt`
   - Click "Publish"

3. **User not authenticated:**
   - Check if user is logged in
   - Check `localStorage` for Firebase auth tokens
   - Try logging out and back in

### Issue: Merged profile not updating

**Symptoms:**
- New documents processed successfully
- Profile fragments created
- But `businessProfile/master` not updated

**Causes & Fixes:**

1. **Merge function error:**
   - Check terminal logs for: "Error merging profile fragments"
   - Look for stack trace

2. **Firestore rules blocking backend write:**
   - Verify `businessProfile/` rules allow backend writes
   - Rule should be: `allow write: if false;` (only backend/Admin SDK)

3. **Manual trigger:**
   ```bash
   # You can manually trigger merge by re-uploading any document
   # Or add a "Refresh Profile" button that calls merge API
   ```

### Issue: High OpenAI costs

**Symptoms:**
- Unexpected OpenAI bill
- Costs higher than expected

**Causes & Fixes:**

1. **Large documents (>50 pages):**
   - Each document sent to OpenAI counts toward usage
   - Solution: Implement text truncation (currently limited to 50k chars)

2. **Repeated uploads:**
   - Replacing documents re-runs AI extraction
   - Solution: Cache results, only re-extract if file changed

3. **Rate limit exceeded:**
   - OpenAI has rate limits per tier
   - Solution: Implement queue system for batch processing

**Cost Monitoring:**
- Check OpenAI usage: https://platform.openai.com/usage
- Set up billing alerts

### Issue: Build errors when deploying

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Module not found errors

**Common Fixes:**

1. **Canvas/pdf-parse errors:**
   - Already handled in `next.config.ts` with webpack externals
   - Verify config exists

2. **Missing environment variables:**
   - Build fails if `.env.local` not set
   - For production, set env vars in hosting platform

3. **Type errors:**
   ```bash
   npm run build
   # Check specific errors and fix type issues
   ```

---

## 🔐 Security Considerations

### Client-Side Security

1. **Firebase Client SDK Keys:**
   - These are PUBLIC and safe to expose in browser
   - Authentication still required to access data
   - Firestore rules enforce access control

2. **Authentication:**
   - Email/password auth via Firebase
   - Tokens stored in `localStorage`
   - Auto-refresh on expiration

3. **File Upload:**
   - Size validation (50MB max)
   - Type validation (only allowed extensions)
   - User-isolated storage paths

### Server-Side Security

1. **Firebase Admin SDK:**
   - `FIREBASE_PRIVATE_KEY` must NEVER be exposed to client
   - Only used in API routes (server-side)
   - Bypasses Firestore security rules (full access)

2. **OpenAI API Key:**
   - `OPENAI_API_KEY` must remain server-side only
   - Never sent to client
   - Used only in API routes

3. **API Routes:**
   - All extraction logic runs server-side
   - User can't manipulate prompts or responses
   - Input validation on all parameters

### Firestore Security Rules

**Key Principles:**
- Users can only access their own data
- Collections nested under `profiles/{userId}/`
- Document ID verification in rules
- Master profile read-only for users (write-only for backend)

**Rule Highlights:**
```javascript
match /profiles/{userId} {
  // Only authenticated user can access their own profile
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  match /documents/{documentId} {
    // Full access to own documents
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  
  match /businessProfile/{docId} {
    // Can read own profile, but only backend can write
    allow read: if request.auth != null && request.auth.uid == userId;
    allow write: if false; // Admin SDK only
  }
}
```

### Storage Security Rules

**Key Principles:**
- User-isolated paths: `Userdocuments/{uid}/`
- UID in path MUST match auth UID
- File type restrictions
- Size limits enforced

**Rule Highlights:**
```javascript
match /Userdocuments/{uid}/{allPaths=**} {
  allow read: if request.auth != null && request.auth.uid == uid;
  
  allow write: if request.auth != null 
    && request.auth.uid == uid
    && request.resource.size < 50 * 1024 * 1024  // 50MB
    && (request.resource.contentType.matches('application/pdf')
      || request.resource.contentType.matches('application/msword')
      || ...);
}
```

---

## 💰 Cost Analysis

### OpenAI Costs

**Model:** `gpt-4o-mini`
- Input: $0.150 per 1M tokens (~$0.00015 per 1K tokens)
- Output: $0.600 per 1M tokens (~$0.0006 per 1K tokens)

**Token Estimation:**
- 1 token ≈ 4 characters
- 10-page PDF ≈ 5,000 words ≈ 7,000 characters ≈ 1,750 tokens

**Cost Per Document:**
| Document Size | Input Tokens | Output Tokens | Cost |
|--------------|--------------|---------------|------|
| 5 pages      | ~875         | ~300          | $0.00033 |
| 10 pages     | ~1,750       | ~500          | $0.00056 |
| 25 pages     | ~4,375       | ~800          | $0.00114 |
| 50 pages     | ~8,750       | ~1,200        | $0.00203 |

**Monthly Estimates:**
- 100 users × 10 docs each = 1,000 docs
- Average 10 pages per doc
- Total cost: ~$0.56/month

**Yearly Estimate:**
- 1,000 users × 10 docs each = 10,000 docs
- Total cost: ~$5.60/year

### Firebase Costs

**Free Tier (Spark Plan):**
- Storage: 5GB
- Downloads: 1GB/day
- Firestore: 1GB storage, 50K reads/day, 20K writes/day
- Authentication: Unlimited

**Paid Tier (Blaze Plan - Pay as you go):**
- Storage: $0.026/GB/month
- Downloads: $0.12/GB
- Firestore: 
  - Storage: $0.18/GB/month
  - Reads: $0.06 per 100K
  - Writes: $0.18 per 100K

**Estimate for 1,000 users:**
- Storage: 1,000 users × 10 docs × 2MB avg = 20GB → ~$0.52/month
- Firestore writes: 1,000 users × 10 docs × 3 writes/doc = 30K → $0.05
- Firestore reads: Minimal (profile loads)
- **Total Firebase: ~$1-2/month**

**Combined Total: ~$2-3/month for 1,000 active users**

---

## 🚀 Future Enhancements (Not Yet Implemented)

### Phase 3: AI Answer Generator

**Goal:** Auto-fill RFP/grant applications using master profile

**Flow:**
1. User uploads RFP/grant document
2. AI extracts questions from opportunity
3. For each question, AI generates answer using:
   - Master `businessProfile`
   - Relevant `pastPerformance` examples
   - Matching `certifications`
4. Show draft answers to user
5. User reviews, edits, approves
6. Submit application

**Estimated Cost:** ~$0.01-0.03 per application (larger context)

### Planned Features

1. **Profile Editing UI:**
   - Page to view/edit master business profile
   - Manual corrections/additions
   - Field-by-field editing

2. **Document Management:**
   - Bulk upload
   - Document versioning
   - Delete documents (+ re-merge profile)
   - Download original files

3. **Smart Deduplication:**
   - Use AI to detect similar entries in arrays
   - "Web Development" vs "Web Dev Services"
   - Merge semantically similar items

4. **Profile Export:**
   - Export profile as PDF resume
   - Export as JSON for backups
   - Share profile link (public view)

5. **Analytics:**
   - Track extraction accuracy
   - Monitor OpenAI usage/costs per user
   - Profile completeness score

6. **Batch Processing:**
   - Upload multiple docs at once
   - Queue system for large batches
   - Background job processing

---

## 📚 Key Dependencies & Versions

```json
{
  "dependencies": {
    "next": "15.5.6",
    "react": "^19",
    "firebase": "^10.14.1",
    "firebase-admin": "^13.0.2",
    "openai": "^4.77.3",
    "pdf2json": "^3.1.5",
    "mammoth": "^1.8.0",
    "jszip": "^3.10.1",
    "tesseract.js": "^5.1.1",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49"
  }
}
```

**Critical Webpack Configuration:**
```typescript
// next.config.ts
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push('canvas');
  }
  return config;
}
```
This prevents webpack errors with pdf-parse's canvas dependency.

---

## 📞 Support & Maintenance

### Common Maintenance Tasks

**1. Update OpenAI Model:**
```typescript
// In src/lib/extraction/aiExtractor.ts
model: "gpt-4o-mini"  // Change to newer model
```

**2. Adjust Field Schema:**
```typescript
// In src/lib/extraction/aiExtractor.ts
// Update AIExtractedFields interface
// Update prompt field definitions
// Re-process existing documents
```

**3. Monitor Costs:**
```bash
# Check OpenAI usage
https://platform.openai.com/usage

# Check Firebase usage
https://console.firebase.google.com/project/therfpqueen-f11fd/usage
```

**4. Database Maintenance:**
```javascript
// Manually re-merge profile after fixing data
// Call from Firebase Console → Firestore → Run query
profiles/{userId}/profileFragments → Get all → Manually trigger merge
```

### Debug Mode

**Enable verbose logging:**
```typescript
// In src/app/api/extract-document/route.ts
// All console.log statements output to terminal
// Add more logs as needed for debugging
```

**View logs:**
```bash
# Development server logs
npm run dev
# Watch terminal output

# Production logs (if deployed to Vercel/similar)
Check hosting platform's log viewer
```

---

## ✅ Testing Checklist

Before deploying or handing off to another developer:

### Environment Setup
- [ ] `.env.local` created with all required keys
- [ ] Firebase Admin SDK credentials configured
- [ ] OpenAI API key added
- [ ] Dependencies installed (`npm install` successful)
- [ ] Dev server starts without errors (`npm run dev`)

### Firestore Rules
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Rules tested (users can't access others' data)

### Upload Flow
- [ ] File upload to Storage works
- [ ] Document metadata created in Firestore
- [ ] Progress bar displays correctly
- [ ] Status updates (pending → processing → completed)

### Extraction Flow
- [ ] PDF text extraction works
- [ ] DOCX text extraction works (optional test)
- [ ] AI extraction returns structured JSON
- [ ] Profile fragment created in Firestore
- [ ] Terminal logs show AI extraction progress

### Profile Merging
- [ ] Master profile created after first upload
- [ ] Profile updates after additional uploads
- [ ] Array fields concatenated correctly
- [ ] Single-value fields prioritize first document
- [ ] `lastUpdated` timestamp accurate

### Error Handling
- [ ] Oversized files rejected
- [ ] Unsupported file types rejected
- [ ] Failed extractions marked as "failed"
- [ ] Error messages clear and helpful

### Security
- [ ] Users can't access other users' files
- [ ] Storage paths enforce user isolation
- [ ] Firestore rules prevent unauthorized access
- [ ] Admin credentials not exposed to client

### Performance
- [ ] Upload completes in reasonable time (<30s for 10MB file)
- [ ] AI extraction completes in <10s for typical document
- [ ] Profile merge is non-blocking (async)
- [ ] UI remains responsive during processing

---

## 📋 Handoff Checklist

When transferring this project to another developer:

### Documentation
- [ ] Share this document
- [ ] Share `AI_EXTRACTION_SETUP.md`
- [ ] Share `AI_EXTRACTION_IMPLEMENTATION.md`
- [ ] Share `.env.local` template (without actual keys)

### Access & Credentials
- [ ] Firebase Console access granted
- [ ] OpenAI organization access (if sharing same account)
- [ ] GitHub repository access
- [ ] Hosting platform access (if deployed)

### Environment Setup
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure `.env.local` with proper credentials
- [ ] Verify Firebase rules are deployed
- [ ] Test upload flow end-to-end

### Knowledge Transfer
- [ ] Walk through architecture diagram
- [ ] Explain data flow from upload → extraction → merge
- [ ] Show Firestore structure
- [ ] Demonstrate testing procedure
- [ ] Review common troubleshooting scenarios

### Next Steps
- [ ] Discuss Phase 3 implementation (AI answer generator)
- [ ] Review planned features
- [ ] Set up monitoring/alerts for costs
- [ ] Establish maintenance schedule

---

## 📄 Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 19, 2025 | Initial keyword-based extraction (deprecated) |
| 2.0 | Nov 19, 2025 | Complete rewrite with AI extraction, added this documentation |

---

## 🎓 Learning Resources

### Firebase
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage Security](https://firebase.google.com/docs/storage/security)

### OpenAI
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4o Mini Guide](https://platform.openai.com/docs/models/gpt-4o-mini)
- [JSON Mode](https://platform.openai.com/docs/guides/json-mode)

### Next.js
- [Next.js App Router](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### Libraries
- [pdf2json](https://github.com/modesty/pdf2json)
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js)
- [JSZip](https://stuk.github.io/jszip/)
- [Tesseract.js](https://tesseract.projectnaptha.com/)

---

## 📞 Contact & Support

For technical questions or issues with this system:

1. **Check troubleshooting section** in this document
2. **Review terminal logs** for specific error messages
3. **Check Firebase Console** for data verification
4. **Verify environment variables** are set correctly
5. **Test with example file** (`pitchdeck.pdf`) to isolate issues

---

**End of Documentation**

This system represents a complete, production-ready document management and AI extraction pipeline. All components have been tested and are ready for use. Follow the setup guide carefully, and refer to the troubleshooting section for any issues.

**Good luck!** 🚀


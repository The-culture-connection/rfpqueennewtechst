# 📄 Document Management & Text Extraction Feature

## 🎯 Overview

This feature allows users to upload their business documents, which are then automatically processed to extract and organize text for use in automated application filling.

---

## Document Upload (Phase 1)

### What's Built

✅ **Document Upload System**
- Upload PDFs, DOCX, and image files (JPG, PNG)
- File storage in Firebase Storage
- Progress tracking during upload
- Document metadata stored in Firestore

✅ **Document Types by Funding Category**

**RFP Users can upload:**
1. Sales Pitch Deck (Required)
2. Capability Statement (Required)
3. Executive Summary
4. "About Us + Services" Sheet
5. Most Recent RFP Response
6. Articles of Incorporation (Required)
7. EIN/Tax ID Letter (Required)
8. Business License (Required)
9. W-9 (Required)
10. Insurance Certificates (Required)

**Grant Users can upload:**
1. Past Grant Proposal (Required)
2. Impact Report (Required)
3. Tax/Financial Compliance File (Required)

**Government Contract Users can upload:**
1. Capability Statement or Gov-Facing Overview (Required)
2. Articles of Incorporation (Required)
3. Minority Business Certification

✅ **User Interface**
- Clean document management page
- Upload/Replace functionality
- Processing status indicators
- Document summary statistics

✅ **Firebase Integration**
- Files stored in Firebase Storage
- Metadata in Firestore `documents` collection
- Extracted data in `extractedData` collection

---

## 🚧 Phase 2: Text Extraction (To Be Implemented)

### Technology Stack Needed

**For PDF Extraction:**
```bash
npm install pdfjs-dist
# or
npm install pdf-parse
```

**For Image/Scan OCR:**
```bash
npm install tesseract.js
```

**For Intelligent Organization:**
```bash
npm install openai
```

### Implementation Plan

#### 1. PDF Text Extraction

```typescript
import * as pdfjsLib from 'pdfjs-dist';

async function extractTextFromPDF(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  
  const pdf = await pdfjsLib.getDocument(buffer).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}
```

#### 2. Image OCR Extraction

```typescript
import Tesseract from 'tesseract.js';

async function extractTextFromImage(fileUrl: string): Promise<string> {
  const result = await Tesseract.recognize(fileUrl, 'eng', {
    logger: m => console.log(m) // Progress logging
  });
  
  return result.data.text;
}
```

#### 3. AI-Powered Text Organization

```typescript
import OpenAI from 'openai';

const prompts = {
  'sales-pitch-deck': `Extract the following from this pitch deck text:
- Overview (company description)
- Mission statement
- Who they serve (target customers/beneficiaries)
- Team members (name, title, bio)
- Key personnel

Return as JSON with these fields.`,
  
  'capability-statement': `Extract:
- Services offered
- Core capabilities
- Past projects/clients
- NAICS codes (if present)

Return as JSON.`,
  
  'rfp-response': `Extract:
- Project approach/methodology
- Past performance examples (project name, client, outcome)
- Pricing/rate information
- Risk management language
- Quality assurance processes

Return as JSON.`,
  
  // ... more prompts for each document type
};

async function organizeWithAI(rawText: string, documentType: string) {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: 'You are a document analysis assistant that extracts structured information from business documents.'
    }, {
      role: 'user',
      content: `${prompts[documentType]}\n\nDocument text:\n${rawText}`
    }],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

#### 4. Complete Extraction Flow

```typescript
async function processDocument(documentId: string, storageUrl: string, documentType: string) {
  // 1. Update status
  await updateDoc(doc(db, 'documents', documentId), {
    processingStatus: 'processing'
  });
  
  try {
    // 2. Download file
    const response = await fetch(storageUrl);
    const fileType = response.headers.get('content-type');
    
    // 3. Extract text based on file type
    let rawText = '';
    if (fileType?.includes('pdf')) {
      rawText = await extractTextFromPDF(storageUrl);
    } else if (fileType?.includes('image')) {
      rawText = await extractTextFromImage(storageUrl);
    } else if (fileType?.includes('word') || fileType?.includes('document')) {
      // Use mammoth or similar for DOCX
      rawText = await extractTextFromDOCX(storageUrl);
    }
    
    // 4. Organize with AI
    const structuredData = await organizeWithAI(rawText, documentType);
    
    // 5. Store extracted data
    await setDoc(doc(db, 'extractedData', documentId), {
      documentId,
      documentType,
      rawText,
      ...structuredData,
      extractedAt: new Date().toISOString(),
      confidence: calculateConfidence(structuredData),
    });
    
    // 6. Update status
    await updateDoc(doc(db, 'documents', documentId), {
      processingStatus: 'completed',
      extractedAt: new Date().toISOString(),
    });
    
    return { success: true };
    
  } catch (error) {
    // Mark as failed
    await updateDoc(doc(db, 'documents', documentId), {
      processingStatus: 'failed',
    });
    throw error;
  }
}
```

---

## 📊 Data Structure

### Firestore Collections

**`documents` collection:**
```typescript
{
  id: "doc_12345",
  userId: "user_123",
  documentType: "sales-pitch-deck",
  fileName: "Company_Pitch.pdf",
  fileSize: 2048576,
  fileType: "application/pdf",
  uploadedAt: "2025-11-18T10:30:00.000Z",
  storageUrl: "gs://bucket/users/user_123/documents/...",
  processingStatus: "completed",  // pending | processing | completed | failed
  extractedAt: "2025-11-18T10:32:00.000Z"
}
```

**`extractedData` collection:**
```typescript
{
  documentId: "doc_12345",
  documentType: "sales-pitch-deck",
  rawText: "Full extracted text...",
  
  // Structured data (varies by document type)
  overview: "We are a tech company...",
  mission: "Our mission is to...",
  whoTheyServe: "We serve small businesses in...",
  team: [
    { name: "John Doe", title: "CEO", bio: "..." },
    { name: "Jane Smith", title: "CTO", bio: "..." }
  ],
  
  extractedAt: "2025-11-18T10:32:00.000Z",
  confidence: 95  // 0-100
}
```

---

## 🎨 User Experience Flow

### 1. Upload Document

```
Dashboard → Documents Button
         ↓
Documents Page (shows required documents based on funding type)
         ↓
Click "Upload" → Select File
         ↓
File uploads to Firebase Storage (progress bar)
         ↓
Metadata saved to Firestore
         ↓
Processing status: "Pending"
```

### 2. Text Extraction (Auto)

```
API triggers text extraction
         ↓
Status: "Processing" (yellow badge)
         ↓
Download from Storage
         ↓
Extract text (PDF/OCR)
         ↓
Organize with AI
         ↓
Save structured data to Firestore
         ↓
Status: "Completed" (green ✓)
```

### 3. View/Use Extracted Data

```
Documents page shows status
         ↓
When filling applications, system pulls extracted data
         ↓
Auto-fills form fields based on document type
```

---

## 🚀 Phase 3: Auto-Fill Applications (Future)

### Concept

When user finds an opportunity and clicks "Apply":

1. **Load extracted data** from all uploaded documents
2. **Match fields** in the application form to extracted data
3. **Pre-fill form** with relevant information:
   - Company name/overview → from pitch deck
   - Services → from capability statement
   - Past performance → from RFP response
   - Team info → from pitch deck
   - Legal info → from articles/EIN
   - etc.
4. **User reviews and submits**

### Example Mapping

**RFP Application Field** → **Source Document**
- "Company Overview" → Sales Pitch Deck (`overview`)
- "Technical Approach" → RFP Response (`projectApproach`)
- "Past Performance" → RFP Response (`pastPerformance[]`)
- "Key Personnel" → Sales Pitch Deck (`team[]`)
- "EIN Number" → EIN Letter (`einNumber`)
- "Insurance Coverage" → Insurance Cert (`generalLiability.coverage`)

---

## 💰 Cost Considerations

### Firebase Storage
- Free tier: 5 GB storage, 1 GB/day download
- Paid: $0.026/GB/month storage, $0.12/GB download
- **Estimate:** ~100 MB per user → ~$0.0026/user/month

### OpenAI API (for text organization)
- GPT-4: ~$0.03 per 1K input tokens, $0.06 per 1K output
- Average document: ~5K tokens input, ~1K output
- **Cost per document:** ~$0.21
- **10 documents per user:** ~$2.10/user one-time

### Tesseract.js (OCR)
- **FREE** (runs client-side or server-side)
- Open source, no API costs

### PDF Parsing
- **FREE** (pdf-parse or pdfjs-dist libraries)
- No API costs

---

## 🔒 Security & Privacy

✅ **User Isolation**
- Documents stored per-user: `Userdocuments/{uid}/`
- Storage rules enforce user-only access
- Each user has their own isolated folder

✅ **Secure Upload**
- Firebase Storage security rules
- Only authenticated users can upload
- Files private by default

✅ **Data Retention**
- Users can delete documents anytime
- Extracted data deleted with document
- No sharing between users

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{documentId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
    
    match /extractedData/{documentId} {
      allow read: if request.auth != null 
        && get(/databases/$(database)/documents/documents/$(documentId)).data.userId == request.auth.uid;
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User documents - secure upload
    match /Userdocuments/{uid}/{allPaths=**} {
      // Only authenticated users can read their own documents
      allow read: if request.auth != null && request.auth.uid == uid;
      
      // Upload with security restrictions
      allow write: if request.auth != null 
        && request.auth.uid == uid
        // 50MB file size limit
        && request.resource.size < 50 * 1024 * 1024
        // Only allow specific file types
        && (request.resource.contentType.matches('application/pdf')
          || request.resource.contentType.matches('application/msword')
          || request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          || request.resource.contentType.matches('image/jpeg')
          || request.resource.contentType.matches('image/jpg')
          || request.resource.contentType.matches('image/png'));
      
      // Allow users to delete their own documents
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## ✅ Current Status

### Phase 1: ✅ COMPLETE
- Document upload UI
- Firebase Storage integration
- Metadata management
- Status tracking
- Required/optional document indicators

### Phase 2: 🚧 IN PROGRESS
- Text extraction (placeholder implemented)
- **TODO:** Implement PDF parsing
- **TODO:** Implement OCR for images
- **TODO:** Implement AI organization
- **TODO:** Store structured data

### Phase 3: 📋 PLANNED
- Auto-fill application forms
- Field mapping system
- Form generation from templates
- Review/edit before submit

---

## 🧪 Testing

### Test Upload Flow

1. Go to Dashboard
2. Click "Documents" button
3. Upload a PDF document
4. Check upload progress
5. Verify status changes: Pending → Processing → Completed
6. Check Firestore:
   - `documents` collection has entry
   - `extractedData` collection has entry (after processing)
7. Check Firebase Storage for uploaded file

### Test Replace Flow

1. Upload document
2. Click "Replace" button
3. Upload new file
4. Verify old file replaced
5. Verify new processing triggered

---

## 📦 Installation (Phase 2)

When ready to implement text extraction:

```bash
cd webapp

# PDF parsing
npm install pdfjs-dist

# OCR for images
npm install tesseract.js

# AI organization
npm install openai

# DOCX parsing (optional)
npm install mammoth
```

**Environment variables needed:**
```bash
# .env.local
OPENAI_API_KEY=sk-...
```

---

## 🎯 Next Steps

1. **Implement Phase 2:**
   - Add pdf-parse library
   - Add Tesseract.js OCR
   - Set up OpenAI integration
   - Create extraction prompts for each document type
   - Test with real documents

2. **Improve UI:**
   - Show extraction preview
   - Edit extracted data manually
   - Confidence scores display
   - Re-process failed documents

3. **Build Phase 3:**
   - Application form templates
   - Field mapping engine
   - Auto-fill logic
   - Review interface

---

## 📝 File Structure

```
webapp/
├── src/
│   ├── app/
│   │   ├── documents/
│   │   │   └── page.tsx           # Document management UI
│   │   └── api/
│   │       └── extract-document/
│   │           └── route.ts       # Text extraction API
│   ├── types/
│   │   └── documents.ts           # All document types & structures
│   └── lib/
│       └── firebase.ts            # Added Firebase Storage
└── Firestore Collections:
    ├── documents/                 # Document metadata
    └── extractedData/             # Extracted & organized text
```

---

**Phase 1 Complete! Ready for Phase 2 implementation.** 🚀

The foundation is built - users can upload documents and the system tracks them. Next step is implementing the actual text extraction and AI organization!


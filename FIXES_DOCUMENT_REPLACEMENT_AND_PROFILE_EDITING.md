# Document Replacement & Profile Editing Fixes

## Overview

Fixed two major issues:
1. ✅ **Document replacement button not working properly**
2. ✅ **Added comprehensive AI-extracted fields to profile editing**

---

## Issue #1: Document Replace Button Fix

### The Problem

When users clicked "Replace" to upload a new version of a document:
- ❌ A NEW document record was created in Firestore
- ❌ The old document remained in the database
- ❌ Both documents showed in the UI
- ❌ AI processing happened on the old file's data
- ❌ Users saw confusing duplicate entries

### Root Cause

The `handleFileUpload` function always called `addDoc()` to create a new document, regardless of whether it was a replacement or initial upload.

### The Solution

**Modified Files:**
1. `webapp/src/app/documents/page.tsx`
2. `webapp/src/app/api/extract-document/route.ts`

**Changes Made:**

#### 1. Document Upload Logic (`page.tsx`)
```typescript
// Now checks for existing documents
const existingDoc = documents.find(d => d.documentType === documentType);
const isReplacement = !!existingDoc;

if (isReplacement && existingDoc) {
  // UPDATE existing document
  const docRef = doc(db, 'profiles', user.uid, 'documents', existingDoc.id);
  await updateDoc(docRef, {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    uploadedAt: new Date().toISOString(),
    storageUrl: downloadURL,
    processingStatus: 'pending',
  });
  docRefId = existingDoc.id;
} else {
  // CREATE new document
  const docRef = await addDoc(docsRef, { ... });
  docRefId = docRef.id;
}
```

#### 2. Profile Fragment Handling (`route.ts`)
```typescript
// Updated to handle replacements
async function processDocument(
  documentId: string,
  storageUrl: string,
  documentType: DocumentType,
  userId: string,
  isReplacement: boolean = false  // NEW PARAMETER
) {
  // ...
  
  if (isReplacement) {
    // Completely replace the old profile fragment
    await profileFragmentRef.set({
      // new data
      replacedAt: new Date().toISOString(),
    });
  } else {
    // Create new fragment
    await profileFragmentRef.set({ ... });
  }
  
  // Trigger profile merge to update master business profile
  mergeProfileFragments(userId);
}
```

### How It Works Now

1. **User clicks "Replace"** on an existing document
2. **System checks** if document of that type already exists
3. **Updates the existing document** record in Firestore (no new record created)
4. **Uploads new file** to Firebase Storage
5. **Replaces the profile fragment** with newly extracted data
6. **Re-merges** all fragments into master business profile
7. **UI updates** to show the new file with "Processing..." status
8. **AI extraction runs** on the NEW file
9. **Old data is completely replaced** with new extracted information

### Testing Steps

1. **Upload Initial Document:**
   - Go to `/documents`
   - Upload a "Sales Pitch Deck" PDF
   - Wait for "✓ Processed" status
   - Note the filename

2. **Replace Document:**
   - Click "Replace" on the same document type
   - Upload a different file
   - Verify:
     - ✅ Only ONE document shows for that type
     - ✅ New filename is displayed
     - ✅ Status changes to "⏳ Pending" then "⏳ Processing..."
     - ✅ Eventually shows "✓ Processed"
     - ✅ No duplicate entries

3. **Verify Data Replacement:**
   - Go to `/profile`
   - Click "Edit" on AI-Extracted Business Information
   - Check that the data reflects the NEW document, not the old one
   - The extracted fields should match content from the replaced file

---

## Issue #2: AI-Extracted Fields in Profile Editor

### The Problem

Users couldn't see or edit the information that AI extracted from their documents. There was no way to:
- ❌ View what data was extracted
- ❌ Manually correct or enhance extracted fields
- ❌ Add missing information
- ❌ Customize the business profile

### The Solution

**Modified File:**
- `webapp/src/app/profile/page.tsx`

**Added Features:**

#### 1. Complete Business Profile Section

Added a comprehensive new section with ALL AI-extractable fields:

```typescript
interface BusinessProfile {
  companyOverview: string;
  mission: string;
  vision: string;
  servicesCapabilities: string[];
  pastPerformance: string[];
  teamExperience: string[];
  approachMethodology: string;
  pricingModel: string;
  certifications: string[];
  problemStatementExamples: string[];
  proposedSolutionExamples: string[];
  outcomesImpact: string[];
  lastUpdated?: string;
}
```

#### 2. Fields Included

**Text Fields:**
- Company Overview
- Mission Statement
- Vision Statement
- Approach & Methodology
- Pricing Model

**Array Fields (with add/remove functionality):**
- Services & Capabilities
- Past Performance & Projects
- Team Experience & Key Personnel
- Certifications & Qualifications
- Problem Statement Examples (for grants)
- Proposed Solution Examples (for grants)
- Outcomes & Impact

#### 3. User Interface Features

**Collapsed View:**
- Shows summary of key fields
- Displays first 3 services/capabilities
- Shows all certifications as badges
- Indicates if no data extracted yet

**Edit Mode:**
- Full text areas for long-form content
- Dynamic array management:
  - Add new items with "+ Add" button
  - Remove items with "Remove" button
  - Edit each item inline
- Helpful placeholders for each field
- Visual distinction with purple/blue gradient background
- 🤖 Robot emoji to indicate AI-extracted data

#### 4. Data Flow

```
Documents Upload
    ↓
AI Extraction (route.ts)
    ↓
Profile Fragments (Firestore)
    ↓
Merge into Master Profile (route.ts)
    ↓
Load in Profile Page (page.tsx)
    ↓
User Can View/Edit
    ↓
Save Updates (page.tsx)
    ↓
Updated Master Profile (Firestore)
```

### Testing Steps

1. **View Extracted Data:**
   - Go to `/profile`
   - Scroll to "🤖 AI-Extracted Business Information" section
   - See collapsed view with summary of extracted data
   - Verify data from uploaded documents appears

2. **Edit Mode:**
   - Click "Edit" button in the AI section
   - See all editable fields expand
   - Try editing text fields
   - Try adding/removing array items

3. **Add New Items:**
   - Click "+ Add Service/Capability"
   - Type in new service
   - Click "+ Add Certification"
   - Type in new certification
   - Verify items appear in the list

4. **Remove Items:**
   - Click "Remove" button on any array item
   - Verify item is removed from list

5. **Save Changes:**
   - Make several edits across different fields
   - Click "Save Changes" at bottom of page
   - Should redirect to `/dashboard`
   - Go back to `/profile`
   - Verify all changes were saved

6. **Replace Document Test:**
   - Upload a new document with different content
   - Wait for processing to complete
   - Go to `/profile`
   - Verify the AI section updates with new extracted data
   - Old data should be replaced

---

## Technical Implementation Details

### Document Replacement Flow

```
User clicks "Replace"
    ↓
Check if document exists (documents.find)
    ↓
Upload new file to Storage
    ↓
Update Firestore document (updateDoc vs addDoc)
    ↓
Call /api/extract-document with isReplacement=true
    ↓
Download new file
    ↓
Extract text
    ↓
Extract fields with AI
    ↓
Replace profile fragment (set, not merge)
    ↓
Merge all fragments into master
    ↓
Update document status to 'completed'
```

### Data Storage Structure

```
Firestore:
  profiles/
    {userId}/
      profileData (basic info: name, email, funding types)
      
      documents/
        {documentId}/
          - userId
          - documentType
          - fileName
          - storageUrl
          - processingStatus
          - uploadedAt
          - extractedAt
      
      profileFragments/
        {documentId}/  ← Same ID as document!
          - documentId
          - documentType
          - rawText (first 10k chars)
          - companyOverview
          - mission
          - vision
          - servicesCapabilities []
          - pastPerformance []
          - teamExperience []
          - approachMethodology
          - pricingModel
          - certifications []
          - problemStatement
          - proposedSolution
          - outcomesImpact []
          - extractedAt
          - replacedAt (if replacement)
      
      businessProfile/
        master/
          - companyOverview (merged)
          - mission (merged)
          - vision (merged)
          - servicesCapabilities [] (merged & deduped)
          - pastPerformance [] (merged)
          - teamExperience [] (merged)
          - approachMethodology (merged)
          - pricingModel (merged)
          - certifications [] (merged & deduped)
          - problemStatementExamples [] (merged)
          - proposedSolutionExamples [] (merged)
          - outcomesImpact [] (merged)
          - lastUpdated
```

### Key Functions

**Documents Page:**
- `handleFileUpload()` - Handles both initial uploads and replacements
- `getDocumentStatus()` - Checks if document type already exists
- `loadDocuments()` - Loads all user documents from Firestore

**Profile Page:**
- `loadBusinessProfile()` - Loads master business profile
- `updateTextField()` - Updates single-value fields
- `updateArrayField()` - Updates array fields
- `addArrayItem()` - Adds empty item to array
- `removeArrayItem()` - Removes item from array by index
- `updateArrayItem()` - Updates specific array item
- `handleSave()` - Saves both basic profile and business profile

**API Route:**
- `POST()` - Initiates document processing
- `processDocument()` - Downloads, extracts, and processes document
- `mergeProfileFragments()` - Combines all fragments into master profile

---

## Benefits of These Changes

### For Users:

1. **No More Confusion:**
   - Only one document per type shows
   - Clear replacement workflow
   - No duplicate entries

2. **Full Control:**
   - See exactly what AI extracted
   - Edit any field manually
   - Add missing information
   - Correct AI mistakes

3. **Better Data Quality:**
   - Can refine extracted data
   - Add context AI might miss
   - Customize for specific applications

4. **Transparency:**
   - Clear indication of AI-extracted data
   - Last updated timestamp
   - See what was extracted from each document

### For System:

1. **Data Integrity:**
   - No duplicate documents
   - Clean database structure
   - Proper replacement handling

2. **Accurate Processing:**
   - Always uses latest uploaded file
   - Profile fragments match documents
   - Master profile stays synchronized

3. **Scalability:**
   - Clean merge logic
   - Proper deduplication
   - Efficient updates

---

## Future Enhancements

### Potential Improvements:

1. **Document History:**
   - Track previous versions
   - Allow rollback to old versions
   - Show changelog

2. **AI Confidence Scores:**
   - Show confidence level for each field
   - Highlight low-confidence extractions
   - Suggest manual review

3. **Field-Level Control:**
   - Lock specific fields from AI updates
   - Mark fields as "manually verified"
   - Choose which documents contribute to which fields

4. **Bulk Operations:**
   - Replace multiple documents at once
   - Batch AI processing
   - Mass edit similar fields

5. **Version Comparison:**
   - Compare old vs new extracted data
   - Highlight changes when replacing
   - Confirm before overwriting

6. **Export Functionality:**
   - Export business profile as JSON
   - Generate formatted PDF
   - Create application templates

---

## Troubleshooting

### Issue: Replace button still creates duplicate

**Check:**
1. Clear browser cache
2. Refresh the page
3. Verify both files are deployed (page.tsx and route.ts)
4. Check browser console for errors
5. Verify Firebase connection

**Debug:**
```javascript
// In handleFileUpload, add console.log
console.log('Existing documents:', documents);
console.log('Is replacement?', isReplacement);
console.log('Document ID:', docRefId);
```

### Issue: Old data still showing after replacement

**Check:**
1. Wait for processing to complete (check "✓ Processed" status)
2. Refresh the profile page
3. Check Firestore console:
   - Look at `profileFragments/{documentId}`
   - Should have `replacedAt` timestamp
   - Data should match new document

**Debug:**
```javascript
// In processDocument, add console.log
console.log('Is replacement?', isReplacement);
console.log('Extracted fields:', extractedFields);
```

### Issue: Profile edit not saving

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Firestore rules allow updates to businessProfile/master
4. User is authenticated

**Debug:**
```javascript
// In handleSave, add console.log
console.log('Saving business profile:', businessProfile);
console.log('User ID:', user?.uid);
```

### Issue: Fields not loading

**Check:**
1. Documents have been processed (status: 'completed')
2. Profile fragments exist in Firestore
3. Master profile has been merged
4. User has correct permissions

**Debug:**
```javascript
// In loadBusinessProfile, add console.log
console.log('Business profile data:', businessProfileSnap.data());
```

---

## Summary

✅ **Issue #1 Fixed:** Replace button now properly updates existing documents instead of creating duplicates

✅ **Issue #2 Fixed:** Profile editor now shows all AI-extracted fields with full editing capabilities

**Next Steps:**
1. Test document replacement workflow
2. Upload sample documents
3. Verify AI extraction
4. Test profile editing
5. Verify data persistence

**Files Modified:**
- `webapp/src/app/documents/page.tsx`
- `webapp/src/app/api/extract-document/route.ts`
- `webapp/src/app/profile/page.tsx`

**No Breaking Changes:** All existing functionality preserved, only enhancements added.



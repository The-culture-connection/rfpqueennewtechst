import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { extractTextFromFile } from '@/lib/extraction/textExtractors';
import { extractFieldsWithAI, AIExtractedFields } from '@/lib/extraction/aiExtractor';
import { DocumentType } from '@/types/documents';

/**
 * Merge all profile fragments into a master business profile
 * This combines data from all uploaded documents into one unified profile
 */
async function mergeProfileFragments(userId: string) {
  console.log(`🔄 Merging profile fragments for user ${userId}...`);
  
  const db = getAdminFirestore();
  
  // Get all profile fragments
  const fragmentsSnapshot = await db
    .collection('profiles')
    .doc(userId)
    .collection('profileFragments')
    .get();
  
  if (fragmentsSnapshot.empty) {
    console.log('⚠️ No profile fragments found');
    return;
  }
  
  const fragments = fragmentsSnapshot.docs.map(doc => doc.data() as AIExtractedFields);
  
  // Merge logic
  const mergedProfile: any = {
    companyOverview: null,
    mission: null,
    vision: null,
    servicesCapabilities: [],
    pastPerformance: [],
    teamExperience: [],
    approachMethodology: null,
    pricingModel: null,
    certifications: [],
    problemStatementExamples: [],
    proposedSolutionExamples: [],
    outcomesImpact: [],
    keywords: [],
    positiveKeywordSuggestions: [],
    negativeKeywordSuggestions: [],
    lastUpdated: new Date().toISOString(),
  };
  
  fragments.forEach(fragment => {
    // Take first non-null for single-value fields
    if (!mergedProfile.companyOverview && fragment.companyOverview) {
      mergedProfile.companyOverview = fragment.companyOverview;
    }
    if (!mergedProfile.mission && fragment.mission) {
      mergedProfile.mission = fragment.mission;
    }
    if (!mergedProfile.vision && fragment.vision) {
      mergedProfile.vision = fragment.vision;
    }
    if (!mergedProfile.approachMethodology && fragment.approachMethodology) {
      mergedProfile.approachMethodology = fragment.approachMethodology;
    }
    if (!mergedProfile.pricingModel && fragment.pricingModel) {
      mergedProfile.pricingModel = fragment.pricingModel;
    }
    
    // Concatenate and dedupe arrays
    if (fragment.servicesCapabilities) {
      mergedProfile.servicesCapabilities.push(...fragment.servicesCapabilities);
    }
    if (fragment.pastPerformance) {
      mergedProfile.pastPerformance.push(...fragment.pastPerformance);
    }
    if (fragment.teamExperience) {
      mergedProfile.teamExperience.push(...fragment.teamExperience);
    }
    if (fragment.certifications) {
      mergedProfile.certifications.push(...fragment.certifications);
    }
    if (fragment.problemStatement) {
      mergedProfile.problemStatementExamples.push(fragment.problemStatement);
    }
    if (fragment.proposedSolution) {
      mergedProfile.proposedSolutionExamples.push(fragment.proposedSolution);
    }
    if (fragment.outcomesImpact) {
      mergedProfile.outcomesImpact.push(...fragment.outcomesImpact);
    }
    if (fragment.keywords) {
      mergedProfile.keywords.push(...fragment.keywords);
    }
    if (fragment.positiveKeywordSuggestions) {
      mergedProfile.positiveKeywordSuggestions.push(...fragment.positiveKeywordSuggestions);
    }
    if (fragment.negativeKeywordSuggestions) {
      mergedProfile.negativeKeywordSuggestions.push(...fragment.negativeKeywordSuggestions);
    }
  });
  
  // Deduplicate arrays (simple string comparison)
  mergedProfile.servicesCapabilities = [...new Set(mergedProfile.servicesCapabilities)];
  mergedProfile.certifications = [...new Set(mergedProfile.certifications)];
  // Deduplicate keywords case-insensitively
  mergedProfile.keywords = [...new Set(mergedProfile.keywords.map((k: string) => k.toLowerCase().trim()).filter((k: string) => k.length > 0))];
  mergedProfile.positiveKeywordSuggestions = [...new Set(mergedProfile.positiveKeywordSuggestions.map((k: string) => k.toLowerCase().trim()).filter((k: string) => k.length > 0))];
  mergedProfile.negativeKeywordSuggestions = [...new Set(mergedProfile.negativeKeywordSuggestions.map((k: string) => k.toLowerCase().trim()).filter((k: string) => k.length > 0))];
  
  // Store merged profile
  await db
    .collection('profiles')
    .doc(userId)
    .collection('businessProfile')
    .doc('master')
    .set(mergedProfile, { merge: true });
  
  console.log(`✅ Profile merged successfully. Fields: ${Object.keys(mergedProfile).filter(k => {
    const val = mergedProfile[k];
    return val && (typeof val === 'string' || (Array.isArray(val) && val.length > 0));
  }).length}`);
}

export async function POST(request: Request) {
  try {
    const { documentId, storageUrl, documentType, userId, isReplacement } = await request.json();

    // Update status to processing (nested under user profile)
    const db = getAdminFirestore();
    const docRef = db.collection('profiles').doc(userId).collection('documents').doc(documentId);
    await docRef.update({
      processingStatus: 'processing',
    });

    console.log(`📄 Processing document ${documentId} of type ${documentType}${isReplacement ? ' (REPLACEMENT)' : ''}`);
    console.log(`📥 Storage URL: ${storageUrl}`);
    
    // Process in background (don't block the response)
    processDocument(documentId, storageUrl, documentType, userId, isReplacement).catch(error => {
      console.error('Background processing error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Document processing started',
      documentId,
    });
  } catch (error) {
    console.error('Error starting document processing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start document processing' },
      { status: 500 }
    );
  }
}

async function processDocument(
  documentId: string,
  storageUrl: string,
  documentType: DocumentType,
  userId: string,
  isReplacement: boolean = false
) {
  const db = getAdminFirestore();
  const docRef = db.collection('profiles').doc(userId).collection('documents').doc(documentId);
  
  try {
    // Step 1: Download file from Storage
    console.log(`⬇️ Downloading file from storage...`);
    const response = await fetch(storageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    
    // Get file type from response headers or document metadata
    const fileType = response.headers.get('content-type') || 'application/pdf';
    console.log(`📋 File type: ${fileType}`);

    // Step 2: Extract raw text
    console.log(`🔤 Extracting text...`);
    const rawText = await extractTextFromFile(fileBuffer, fileType);
    console.log(`✅ Extracted ${rawText.length} characters of text`);

    // Step 3: Extract fields using AI
    console.log(`🤖 Extracting fields with AI...`);
    const extractedFields = await extractFieldsWithAI(rawText, documentType);
    console.log(`✅ AI extraction complete. Extracted ${Object.keys(extractedFields).filter(k => extractedFields[k as keyof typeof extractedFields] !== null).length} fields`);

    // Step 4: Store profile fragment in Firestore (Admin SDK)
    // Each document contributes a "fragment" to the user's master business profile
    // Use documentId as the fragment ID so replacements overwrite the old data
    const profileFragmentRef = db.collection('profiles').doc(userId).collection('profileFragments').doc(documentId);
    
    if (isReplacement) {
      console.log(`🔄 Replacing existing profile fragment for document ${documentId}`);
      // Use set() to completely replace the old fragment
      await profileFragmentRef.set({
        documentId,
        documentType,
        userId,
        rawText: rawText.slice(0, 10000), // Store first 10k chars for reference
        ...extractedFields,
        extractedAt: new Date().toISOString(),
        replacedAt: new Date().toISOString(),
      });
    } else {
      console.log(`➕ Creating new profile fragment for document ${documentId}`);
      await profileFragmentRef.set({
        documentId,
        documentType,
        userId,
        rawText: rawText.slice(0, 10000), // Store first 10k chars for reference
        ...extractedFields,
        extractedAt: new Date().toISOString(),
      });
    }

    // Step 5: Update document status to completed
    await docRef.update({
      processingStatus: 'completed',
      extractedAt: new Date().toISOString(),
    });

    // Step 6: Trigger profile merge (async, don't wait)
    // This will combine all profile fragments into a master businessProfile
    // This is especially important for replacements to update the master profile
    console.log(`🔄 Triggering profile merge...`);
    mergeProfileFragments(userId).catch(err => {
      console.error('Error merging profile fragments:', err);
    });
    
    console.log(`✅ Document ${documentId} processed successfully${isReplacement ? ' (REPLACED)' : ''}`);
    
  } catch (error: any) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    
    // Update status to failed
    await docRef.update({
      processingStatus: 'failed',
    });
  }
}

/* 
TODO: Full implementation would look like this:

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

async function extractTextFromImage(fileBuffer: Buffer): Promise<string> {
  const result = await Tesseract.recognize(fileBuffer, 'eng');
  return result.data.text;
}

async function organizeTextWithAI(rawText: string, documentType: DocumentType): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompts = {
    'sales-pitch-deck': 'Extract: overview, mission, who they serve, team members...',
    'capability-statement': 'Extract: services, offerings, capabilities...',
    // ... more prompts for each document type
  };
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `${prompts[documentType]}\n\nDocument text:\n${rawText}`
    }],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
*/


// AI-based field extraction using OpenAI
// Extracts structured data from raw document text

import OpenAI from 'openai';
import { DocumentType } from '@/types/documents';

// Lazy-load OpenAI client to avoid build-time initialization
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface AIExtractedFields {
  companyOverview?: string | null;
  mission?: string | null;
  vision?: string | null;
  servicesCapabilities?: string[] | null;
  pastPerformance?: string[] | null;
  teamExperience?: string[] | null;
  approachMethodology?: string | null;
  pricingModel?: string | null;
  certifications?: string[] | null;
  problemStatement?: string | null;
  proposedSolution?: string | null;
  outcomesImpact?: string[] | null;
  keywords?: string[] | null;
  positiveKeywordSuggestions?: string[] | null; // Keywords to prioritize/include
  negativeKeywordSuggestions?: string[] | null; // Keywords to omit/exclude
}

/**
 * Extract structured fields from raw text using AI
 */
export async function extractFieldsWithAI(
  rawText: string,
  documentType: DocumentType
): Promise<AIExtractedFields> {
  console.log(`🤖 Starting AI extraction for document type: ${documentType}`);
  
  // Build prompt based on document type
  const prompt = buildPromptForDocumentType(documentType);
  
  try {
    const openaiClient = getOpenAIClient();
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective model
      messages: [
        {
          role: "system",
          content: "You are an expert RFP, grant, and government contracting assistant. Your job is to extract structured information from business documents with perfect accuracy. Do NOT invent or hallucinate data. If a field is not clearly present in the document, return null for it."
        },
        {
          role: "user",
          content: prompt
        },
        {
          role: "user",
          content: `Document text:\n\n${rawText.slice(0, 50000)}` // Limit to ~50k chars to stay under token limits
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistency
    });

    const extracted = JSON.parse(response.choices[0].message.content || '{}');
    console.log(`✅ AI extraction complete. Extracted ${Object.keys(extracted).filter(k => extracted[k] !== null).length} fields`);
    
    // Ensure keyword suggestions are arrays, not null
    if (!extracted.positiveKeywordSuggestions || !Array.isArray(extracted.positiveKeywordSuggestions)) {
      extracted.positiveKeywordSuggestions = [];
    }
    if (!extracted.negativeKeywordSuggestions || !Array.isArray(extracted.negativeKeywordSuggestions)) {
      extracted.negativeKeywordSuggestions = [];
    }
    
    // Log keyword suggestions for debugging
    if (extracted.negativeKeywordSuggestions.length > 0) {
      console.log(`📊 AI suggested ${extracted.negativeKeywordSuggestions.length} negative keywords:`, extracted.negativeKeywordSuggestions.slice(0, 5));
    } else {
      console.log('⚠️ AI did not suggest any negative keywords - this may indicate the document content was too generic or unclear');
    }
    
    return extracted;
  } catch (error: any) {
    console.error('❌ AI extraction error:', error.message);
    throw new Error(`AI extraction failed: ${error.message}`);
  }
}

/**
 * Build extraction prompt based on document type
 */
function buildPromptForDocumentType(documentType: DocumentType): string {
  const basePrompt = `Extract ONLY the fields requested from this document. If a field is not clearly present, return null for it. Do NOT invent data.

Return JSON exactly in this format:

{
  "companyOverview": string|null,
  "mission": string|null,
  "vision": string|null,
  "servicesCapabilities": string[]|null,
  "pastPerformance": string[]|null,
  "teamExperience": string[]|null,
  "approachMethodology": string|null,
  "pricingModel": string|null,
  "certifications": string[]|null,
  "problemStatement": string|null,
  "proposedSolution": string|null,
  "outcomesImpact": string[]|null,
  "keywords": string[]|null,
  "positiveKeywordSuggestions": string[]|null,
  "negativeKeywordSuggestions": string[]|null
}

Field definitions:
- companyOverview: Brief company description, what they do, who they serve
- mission: Company mission statement
- vision: Company vision statement
- servicesCapabilities: Array of services/products/capabilities offered
- pastPerformance: Array of past projects, clients, or case studies (keep each entry concise)
- teamExperience: Array of key team members, their roles, and relevant experience
- approachMethodology: How the company approaches projects/problems
- pricingModel: Pricing strategy, rates, or fee structure
- certifications: Array of certifications, licenses, or qualifications (e.g., "MBE - Ohio", "ISO 9001")
- problemStatement: For grants/proposals - what problem is being addressed
- proposedSolution: For grants/proposals - what solution is being proposed
- outcomesImpact: Array of outcomes, impact metrics, or success stories
- keywords: Array of relevant keywords, terms, or phrases that describe the organization's focus areas, expertise, industries, technologies, methodologies, or specializations. Extract 10-20 most important keywords that would help match this organization with relevant opportunities. Examples: "machine learning", "sustainable energy", "community health", "urban planning", "STEM education", etc.

- positiveKeywordSuggestions: Array of 5-10 keywords or phrases that should be PRIORITIZED when matching opportunities. These are terms that strongly align with the organization's core strengths, services, or focus areas. These keywords should help surface opportunities that are highly relevant. Examples: "healthcare technology", "renewable energy", "education technology", "cybersecurity", etc.

- negativeKeywordSuggestions: Array of 5-15 keywords or phrases that should be EXCLUDED (hard filter) when matching opportunities. These are terms that indicate opportunities NOT suitable for this organization. Be INTELLIGENT and INTUITIVE about this:

  **Context-Aware Exclusion Rules:**
  1. **General vs. Specific**: If the organization focuses on general areas (e.g., "health", "education", "technology"), exclude overly specific or technical sub-domains that don't match their actual work:
     - If they do "health" or "healthcare" → EXCLUDE: "nervous system", "cardiovascular", "oncology", "neurology", "pathology", "biochemistry", "molecular biology", "clinical trials", "drug development", "pharmaceutical", "medical research", "laboratory research", "biomedical research"
     - If they do "education" → EXCLUDE: "dissertation", "thesis", "postdoctoral", "graduate research", "academic research", "scholarly research", "university research", "faculty research", "tenure-track"
     - If they do "technology" → EXCLUDE: "hardware development", "semiconductor", "chip design", "manufacturing", "industrial automation" (unless they specifically do these)
     - If they do "business" or "consulting" → EXCLUDE: "construction", "real estate", "food service", "retail", "manufacturing" (unless specifically mentioned)

  2. **Research vs. Commercial**: If the organization is commercial/for-profit and focuses on business applications, exclude academic research terms:
     - EXCLUDE: "principal investigator", "research grant", "academic institution", "university", "college", "scholarly", "peer-reviewed", "publication", "dissertation", "thesis", "postdoc", "faculty", "tenure"

  3. **Scale Mismatch**: If they're a small business/startup, exclude terms for large-scale operations:
     - EXCLUDE: "infrastructure", "construction", "large-scale manufacturing", "industrial", "enterprise software" (unless they specifically do these)

  4. **Industry Mismatch**: Based on the document, identify industries they DON'T serve:
     - If no mention of construction → EXCLUDE: "construction", "building", "infrastructure", "civil engineering"
     - If no mention of food → EXCLUDE: "food service", "restaurant", "catering", "culinary"
     - If no mention of retail → EXCLUDE: "retail", "e-commerce", "merchandising"

  5. **Related Terms to Auto-Exclude**: When you identify a general keyword (like "health"), automatically suggest related specific terms that should be excluded:
     - "health" → suggest excluding: "nervous system", "cardiovascular", "oncology", "neurology", "pathology", "biochemistry", "molecular biology", "clinical trials", "drug development", "pharmaceutical", "medical research", "laboratory research", "biomedical research", "anatomy", "physiology", "immunology", "genetics", "genomics"
     - "education" → suggest excluding: "dissertation", "thesis", "postdoctoral", "graduate research", "academic research", "scholarly research", "university research", "faculty research", "tenure-track", "K-12" (if they do higher ed), "higher education" (if they do K-12)
     - "technology" → suggest excluding: "hardware development", "semiconductor", "chip design", "manufacturing", "industrial automation" (unless specifically mentioned)

  **Examples of good negative keywords:**
  - For a general health/wellness company: ["nervous system", "cardiovascular", "oncology", "neurology", "pathology", "biochemistry", "molecular biology", "clinical trials", "drug development", "pharmaceutical", "medical research", "laboratory research"]
  - For a business consulting firm: ["construction", "real estate", "food service", "retail", "manufacturing", "principal investigator", "research grant", "academic institution"]
  - For a K-12 education company: ["dissertation", "thesis", "postdoctoral", "graduate research", "university research", "faculty research", "tenure-track", "higher education"]

  **Important**: Only include negative keywords that are CLEARLY not relevant based on the document content. Be conservative - if unsure, don't include it.

`;

  // Add document-specific instructions
  const typeSpecificInstructions: Record<string, string> = {
    'sales-pitch-deck': `
This is a sales pitch deck. Focus on:
- Extract company overview from intro/welcome slides
- Look for problem/solution slides
- Extract market size, validation, or traction as outcomesImpact
- Look for business model or revenue info as pricingModel
- Extract competitive advantages as servicesCapabilities
- Extract team info if present`,

    'capability-statement': `
This is a capability statement. Focus on:
- Company overview and background
- Core capabilities and services
- Past performance and client work
- Certifications and qualifications
- Team experience`,

    'most-recent-rfp-response': `
This is an RFP response. Focus on:
- Project approach and methodology
- Past performance on similar projects
- Team qualifications
- Pricing and cost breakdown
- Technical capabilities`,

    'past-grant-proposal': `
This is a grant proposal. Focus on:
- Organizational mission and overview
- Problem statement (need being addressed)
- Proposed solution (program/project description)
- Expected outcomes and impact
- Past performance or track record`,

    'impact-report': `
This is an impact report. Focus on:
- Outcomes achieved
- Impact metrics and data
- Success stories or case studies
- Organizational mission and overview`,

    'team-key-personnel': `
This is a team/personnel document. Focus on:
- Team member names, roles, and titles
- Relevant experience and qualifications
- Past projects or achievements
- Education and certifications`,

    'executive-summary': `
This is an executive summary. Focus on:
- Company overview
- Key services or offerings
- Unique value proposition
- High-level approach or methodology`,

    'gov-capability-statement-overview': `
This is a government-facing capability statement. Focus on:
- NAICS codes (if mentioned)
- Government contracting experience
- Certifications (8(a), SDVOSB, WOSB, HUBZone, etc.)
- GSA schedule or contract vehicles
- Security clearances
- Past government clients`,

    'articles-of-incorporation-formation': `
This is a legal formation document. Extract only:
- Company legal name
- Formation date
- Entity type (LLC, Corp, etc.)
- Any certifications mentioned`,

    'business-license': `
This is a business license. Extract only:
- License type
- Issuing authority
- License number (if appropriate)
- Expiration date`,

    'minority-business-pdf': `
This is a minority/small business certification. Extract:
- Certification type (MBE, WBE, SBE, DBE, etc.)
- Certifying agency
- Certification number`,
  };

  return basePrompt + (typeSpecificInstructions[documentType] || '');
}

/**
 * Hybrid approach: Use rule-based extraction first, then refine with AI
 */
export async function refineExtractedFieldsWithAI(
  ruleBasedExtraction: any
): Promise<AIExtractedFields> {
  console.log(`🤖 Refining rule-based extraction with AI...`);
  
  const prompt = `You are cleaning up structured fields extracted from a company's documents using rule-based parsing.
You will be given rough text for several fields. Your job is to:

1. Normalize and clean up the content
2. Remove duplicates
3. Choose the most complete and coherent version if duplicated
4. Format arrays properly
5. Keep content concise (max 200 words per field)

If a field looks empty, incomplete, or nonsensical, set it to null.

Return JSON in the same format as input, but cleaned up.`;

  try {
    const openaiClient = getOpenAIClient();
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data cleaning and normalization assistant."
        },
        {
          role: "user",
          content: prompt + "\n\nExtracted Fields:\n" + JSON.stringify(ruleBasedExtraction, null, 2)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const refined = JSON.parse(response.choices[0].message.content || '{}');
    console.log(`✅ AI refinement complete`);
    
    return refined;
  } catch (error: any) {
    console.error('❌ AI refinement error:', error.message);
    // Fall back to rule-based extraction if AI fails
    return ruleBasedExtraction;
  }
}


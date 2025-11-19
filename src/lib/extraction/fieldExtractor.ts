// Field extractor - scores sections and extracts best matches

import { FIELD_KEYWORDS, DOCUMENT_FIELD_WEIGHTS, DOC_TYPE_FIELD_HINTS, FieldKeywords } from './keywords';
import { DocumentSection } from './sectionParser';
import { DocumentType } from '@/types/documents';

export interface ExtractedFields {
  companyOverview?: string;
  mission?: string;
  vision?: string;
  servicesCapabilities?: string;
  pastPerformance?: string;
  teamExperience?: string;
  approachMethodology?: string;
  pricing?: string;
  certifications?: string;
  problemStatement?: string;
  proposedSolution?: string;
  outcomesImpact?: string;
}

/**
 * Score a section for a specific field based on keywords
 */
function scoreSection(section: DocumentSection, field: FieldKeywords): number {
  let score = 0;
  const heading = section.heading.toLowerCase();
  const body = section.body.toLowerCase();

  // Heading keywords are worth more (8 points each) - increased from 5
  field.heading.forEach(keyword => {
    if (heading.includes(keyword.toLowerCase())) {
      score += 8;
    }
  });

  // Body keywords - count matches
  let bodyMatches = 0;
  field.body.forEach(keyword => {
    if (body.includes(keyword.toLowerCase())) {
      bodyMatches++;
    }
  });

  if (bodyMatches > 0) {
    score += bodyMatches * 2;
  }

  // Enforce minimum body matches if specified
  if (field.minBodyMatches && bodyMatches < field.minBodyMatches) {
    score = 0; // Zero out score if not enough body matches
  }

  return score;
}

/**
 * Extract the best matching section for a field
 */
function extractBestMatch(
  sections: DocumentSection[], 
  fieldName: string,
  documentType?: DocumentType
): string {
  const field = FIELD_KEYWORDS[fieldName];
  if (!field) return '';

  let bestMatch = { score: 0, text: '' };

  // Get document type hints if available
  const hints = documentType && DOC_TYPE_FIELD_HINTS[documentType]?.[fieldName] || [];

  sections.forEach(section => {
    let score = 0;
    const headingLower = section.heading.toLowerCase();

    // Strong boost (+10) if section heading matches a hint
    if (hints.length > 0 && hints.some(h => headingLower.includes(h.toLowerCase()))) {
      score += 10;
    }

    // Add keyword-based score
    score += scoreSection(section, field);

    // Apply document type weight if available
    if (documentType && DOCUMENT_FIELD_WEIGHTS[documentType]?.[fieldName]) {
      score *= DOCUMENT_FIELD_WEIGHTS[documentType][fieldName];
    }

    if (score > bestMatch.score) {
      bestMatch = { score, text: section.body };
    }
  });

  // Limit length (prevent storing entire documents in a single field)
  const maxLength = getMaxLengthForField(fieldName);
  return bestMatch.text.slice(0, maxLength);
}

/**
 * Get maximum character length for a field
 */
function getMaxLengthForField(fieldName: string): number {
  const limits: Record<string, number> = {
    mission: 800,
    vision: 800,
    companyOverview: 800, // Reduced from 1500
    servicesCapabilities: 1200,
    pastPerformance: 1500,
    teamExperience: 1200,
    approachMethodology: 1500,
    pricing: 800, // Reduced from 1500
    certifications: 1000,
    problemStatement: 600, // Reduced from 2000
    proposedSolution: 800, // Reduced from 3000
    outcomesImpact: 1200
  };

  return limits[fieldName] || 1000;
}

/**
 * Extract all fields from sections
 */
export function extractFields(
  sections: DocumentSection[], 
  documentType?: DocumentType
): ExtractedFields {
  console.log(`🔍 Extracting fields from ${sections.length} sections (document type: ${documentType || 'unknown'})`);

  const fields: ExtractedFields = {};

  // Extract each field
  const fieldNames = Object.keys(FIELD_KEYWORDS);
  
  fieldNames.forEach(fieldName => {
    const extracted = extractBestMatch(sections, fieldName, documentType);
    if (extracted && extracted.trim().length > 0) {
      fields[fieldName as keyof ExtractedFields] = extracted;
      console.log(`  ✅ ${fieldName}: ${extracted.length} characters extracted`);
    } else {
      console.log(`  ⚠️ ${fieldName}: No match found`);
    }
  });

  return fields;
}

/**
 * Extract specific fields (for targeted extraction)
 */
export function extractSpecificFields(
  sections: DocumentSection[],
  fieldNames: string[],
  documentType?: DocumentType
): Partial<ExtractedFields> {
  const fields: Partial<ExtractedFields> = {};

  fieldNames.forEach(fieldName => {
    const extracted = extractBestMatch(sections, fieldName, documentType);
    if (extracted && extracted.trim().length > 0) {
      fields[fieldName as keyof ExtractedFields] = extracted;
    }
  });

  return fields;
}


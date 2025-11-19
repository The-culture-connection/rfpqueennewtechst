// Section parser - identifies headings and splits document into sections

import { splitIntoSlides, looksLikePitchDeck } from './slideSplitter';

export interface DocumentSection {
  heading: string;
  body: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse raw text into sections based on heading heuristics
 */
export function parseIntoSections(rawText: string): DocumentSection[] {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const sections: DocumentSection[] = [];
  
  let currentHeading = "Introduction"; // Default first section
  let currentBody: string[] = [];
  let startIndex = 0;

  lines.forEach((line, index) => {
    if (isLikelyHeading(line, lines, index)) {
      // Save previous section if it has content
      if (currentBody.length > 0) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join('\n'),
          startIndex,
          endIndex: index - 1
        });
      }
      
      // Start new section
      currentHeading = cleanHeading(line);
      currentBody = [];
      startIndex = index;
    } else {
      // Add to current section body
      currentBody.push(line);
    }
  });

  // Add final section
  if (currentBody.length > 0) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join('\n'),
      startIndex,
      endIndex: lines.length - 1
    });
  }

  return sections;
}

/**
 * Heuristics to determine if a line is likely a heading
 */
function isLikelyHeading(line: string, allLines: string[], index: number): boolean {
  // Skip very long lines (likely paragraphs)
  if (line.length > 100) return false;
  
  // Skip very short lines (likely incomplete)
  if (line.length < 3) return false;

  // Check for ALL CAPS (common heading style)
  if (line === line.toUpperCase() && /[A-Z]/.test(line)) {
    return true;
  }

  // Check for numbered sections: "1.", "1.1", "I.", "A."
  if (/^(\d+\.)+\s+[A-Z]/.test(line) || /^[IVX]+\.\s+[A-Z]/.test(line) || /^[A-Z]\.\s+[A-Z]/.test(line)) {
    return true;
  }

  // Check for lines ending with colon (common heading pattern)
  if (line.endsWith(':') && line.length < 80) {
    return true;
  }

  // NEW: Check for single-word or very short capitalized lines (slide titles)
  // Common in PowerPoint: "Problem", "Solution", "Market Size", etc.
  const words = line.trim().split(/\s+/);
  if (words.length <= 4 && line.length < 50) {
    // Check if it starts with a capital letter
    if (/^[A-Z]/.test(line)) {
      // Check if next line exists and is longer (indicating this is a title)
      const nextLine = index < allLines.length - 1 ? allLines[index + 1] : '';
      if (nextLine.length > line.length) {
        return true;
      }
      // Or if previous line was also short (section break pattern)
      const prevLine = index > 0 ? allLines[index - 1] : '';
      if (prevLine.length < 50) {
        return true;
      }
    }
  }

  // Check for short lines surrounded by longer text (likely a section break)
  if (line.length < 60) {
    const prevLine = index > 0 ? allLines[index - 1] : '';
    const nextLine = index < allLines.length - 1 ? allLines[index + 1] : '';
    
    if (prevLine.length > 80 && nextLine.length > 80) {
      // Short line between long lines, likely a heading
      return true;
    }
  }

  // Check for common heading patterns (capitalized first word)
  if (/^[A-Z][a-z]+/.test(line) && line.split(' ').length <= 8) {
    // Starts with capital, short phrase
    const nextLine = index < allLines.length - 1 ? allLines[index + 1] : '';
    if (nextLine.length > line.length * 1.5) {
      // Next line is significantly longer, this might be a heading
      return true;
    }
  }

  return false;
}

/**
 * Clean up heading text (remove numbers, colons, etc.)
 */
function cleanHeading(heading: string): string {
  return heading
    .replace(/^(\d+\.)+\s*/, '') // Remove leading numbers
    .replace(/^[IVX]+\.\s*/, '') // Remove roman numerals
    .replace(/^[A-Z]\.\s*/, '') // Remove letter numbering
    .replace(/:$/, '') // Remove trailing colon
    .trim();
}

/**
 * Fallback: If no sections found, create default sections from paragraphs
 */
export function createFallbackSections(rawText: string): DocumentSection[] {
  const paragraphs = rawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  
  return paragraphs.map((para, index) => ({
    heading: `Section ${index + 1}`,
    body: para,
    startIndex: index,
    endIndex: index
  }));
}

/**
 * Main entry point: parse text with fallback
 */
export function extractSections(rawText: string, documentType?: string): DocumentSection[] {
  const sections = parseIntoSections(rawText);
  
  // If we found very few sections, try slide-based splitting for pitch decks
  if (sections.length < 3) {
    if (documentType === 'sales-pitch-deck' || looksLikePitchDeck(rawText)) {
      console.log('⚠️ Few sections found, trying slide-based splitting for pitch deck...');
      const slideSections = splitIntoSlides(rawText);
      
      if (slideSections.length > sections.length) {
        console.log(`✅ Found ${slideSections.length} slides using slide-based splitting`);
        return slideSections;
      }
    }
    
    // Last resort: paragraph splitting
    console.log('⚠️ Few sections found, using fallback paragraph splitting');
    return createFallbackSections(rawText);
  }
  
  console.log(`✅ Extracted ${sections.length} sections from document`);
  return sections;
}


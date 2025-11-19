// Slide-based splitting for pitch decks
// When generic section detection fails, use known slide patterns

import { DocumentSection } from './sectionParser';

const SLIDE_HEADINGS = [
  "welcome",
  "introduction",
  "problem",
  "solution",
  "market validation",
  "market size",
  "product",
  "business model",
  "revenue model",
  "market adoption",
  "traction",
  "competition",
  "competitive advantages",
  "competitive advantage",
  "team",
  "financials",
  "ask",
  "go to market",
  "roadmap",
  "vision",
  "mission"
];

/**
 * Split text into slides based on known pitch deck heading patterns
 */
export function splitIntoSlides(rawText: string): DocumentSection[] {
  const lower = rawText.toLowerCase();

  // Build regex pattern: (problem|solution|market validation|...)\s*\d?
  const pattern = new RegExp(
    "\\b(" + SLIDE_HEADINGS.join("|") + ")\\b\\s*\\d?",
    "gi"
  );

  const matches: { index: number; heading: string }[] = [];
  let m;
  while ((m = pattern.exec(rawText)) !== null) {
    matches.push({ index: m.index, heading: m[1] });
  }

  if (matches.length === 0) {
    // No slide headings found, return single section
    return [{ heading: "Document", body: rawText, startIndex: 0, endIndex: rawText.length }];
  }

  const sections: DocumentSection[] = [];

  // Capture intro text BEFORE the first heading as "overview"
  if (matches[0].index > 50) { // At least 50 chars of intro
    const intro = rawText.slice(0, matches[0].index).trim();
    if (intro.length > 0) {
      sections.push({
        heading: "Introduction",
        body: intro,
        startIndex: 0,
        endIndex: matches[0].index
      });
    }
  }

  // Create sections between each match
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const body = rawText.slice(start, end).trim();

    sections.push({
      heading: matches[i].heading,
      body,
      startIndex: start,
      endIndex: end
    });
  }

  return sections;
}

/**
 * Check if text looks like a pitch deck (has multiple slide headings)
 */
export function looksLikePitchDeck(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  let matchCount = 0;

  for (const heading of SLIDE_HEADINGS) {
    if (lower.includes(heading)) {
      matchCount++;
      if (matchCount >= 3) return true; // 3+ slide headings = pitch deck
    }
  }

  return false;
}


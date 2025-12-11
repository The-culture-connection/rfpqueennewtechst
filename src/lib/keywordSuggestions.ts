/**
 * Utility functions for intelligent keyword suggestions
 * Automatically suggests related negative keywords based on general keywords
 */

/**
 * Get related negative keywords for a given general keyword
 * This helps prevent overly specific matches (e.g., "health" shouldn't match "nervous system")
 */
export function getRelatedNegativeKeywords(keyword: string): string[] {
  const keywordLower = keyword.toLowerCase().trim();
  
  // Health/Healthcare related exclusions
  if (keywordLower.includes('health') || keywordLower.includes('healthcare') || keywordLower.includes('wellness')) {
    return [
      'nervous system',
      'cardiovascular',
      'oncology',
      'neurology',
      'pathology',
      'biochemistry',
      'molecular biology',
      'clinical trials',
      'drug development',
      'pharmaceutical',
      'medical research',
      'laboratory research',
      'biomedical research',
      'anatomy',
      'physiology',
      'immunology',
      'genetics',
      'genomics',
      'neuroscience',
      'pharmacology',
      'virology',
      'microbiology',
    ];
  }
  
  // Education related exclusions
  if (keywordLower.includes('education') || keywordLower.includes('learning') || keywordLower.includes('teaching')) {
    return [
      'dissertation',
      'thesis',
      'postdoctoral',
      'graduate research',
      'academic research',
      'scholarly research',
      'university research',
      'faculty research',
      'tenure-track',
      'principal investigator',
      'research grant',
      'peer-reviewed',
      'publication',
    ];
  }
  
  // Technology related exclusions (if general tech, not specific)
  if (keywordLower.includes('technology') || keywordLower.includes('tech') || keywordLower.includes('software')) {
    // Only exclude if they don't specifically mention these areas
    return [
      'hardware development',
      'semiconductor',
      'chip design',
      'manufacturing',
      'industrial automation',
      'mechanical engineering',
      'electrical engineering',
    ];
  }
  
  // Business/Consulting related exclusions
  if (keywordLower.includes('business') || keywordLower.includes('consulting') || keywordLower.includes('management')) {
    return [
      'construction',
      'real estate',
      'food service',
      'retail',
      'manufacturing',
      'principal investigator',
      'research grant',
      'academic institution',
      'university',
      'college',
      'scholarly',
      'peer-reviewed',
      'publication',
    ];
  }
  
  // Research related exclusions (if they do applied/commercial research, not academic)
  if (keywordLower.includes('research') && !keywordLower.includes('academic')) {
    return [
      'dissertation',
      'thesis',
      'postdoctoral',
      'graduate research',
      'academic research',
      'scholarly research',
      'university research',
      'faculty research',
      'tenure-track',
      'principal investigator',
      'peer-reviewed',
      'publication',
    ];
  }
  
  // Environment/Sustainability related exclusions
  if (keywordLower.includes('environment') || keywordLower.includes('sustainability') || keywordLower.includes('green')) {
    return [
      'construction',
      'mining',
      'oil',
      'gas',
      'petroleum',
      'fossil fuel',
      'drilling',
    ];
  }
  
  // Social services related exclusions
  if (keywordLower.includes('social') || keywordLower.includes('community') || keywordLower.includes('nonprofit')) {
    return [
      'construction',
      'real estate',
      'food service',
      'retail',
      'manufacturing',
      'for-profit',
      'commercial',
      'profit',
    ];
  }
  
  return [];
}

/**
 * Analyze a keyword and suggest related negative keywords
 * Returns suggestions that should be added to negative keywords
 */
export function suggestNegativeKeywordsForKeyword(keyword: string, existingNegativeKeywords: string[] = []): string[] {
  const suggestions = getRelatedNegativeKeywords(keyword);
  
  // Filter out suggestions that are already in negative keywords
  const existingLower = existingNegativeKeywords.map(k => k.toLowerCase());
  return suggestions.filter(s => !existingLower.includes(s.toLowerCase()));
}

/**
 * Analyze multiple keywords and aggregate related negative keyword suggestions
 */
export function suggestNegativeKeywordsForKeywords(
  keywords: string[],
  existingNegativeKeywords: string[] = []
): string[] {
  const allSuggestions = new Set<string>();
  
  for (const keyword of keywords) {
    const suggestions = getRelatedNegativeKeywords(keyword);
    suggestions.forEach(s => allSuggestions.add(s));
  }
  
  // Filter out suggestions that are already in negative keywords
  const existingLower = existingNegativeKeywords.map(k => k.toLowerCase());
  return Array.from(allSuggestions).filter(s => !existingLower.includes(s.toLowerCase()));
}


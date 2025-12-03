import { Opportunity, UserProfile, UserPreferences } from '@/types';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Preference Learning System
 * 
 * Analyzes user behavior (passes, saves, applies) to learn patterns
 * and improve future recommendations
 */

export interface BehaviorPattern {
  keywords: Map<string, number>;  // keyword -> frequency
  agencies: Map<string, number>;  // agency -> frequency
  amounts: Map<string, number>;   // amount range -> frequency
  categories: Map<string, number>; // category -> frequency
}

// Extract keywords from opportunity
function extractOpportunityKeywords(opportunity: Opportunity): string[] {
  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);

  const words = combined
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  // Get top keywords
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Analyze behavior patterns
export async function analyzeUserBehavior(userId: string): Promise<UserPreferences> {
  if (!db) {
    console.warn('Firebase not initialized');
    return {};
  }

  try {
    const passPattern: BehaviorPattern = {
      keywords: new Map(),
      agencies: new Map(),
      amounts: new Map(),
      categories: new Map(),
    };

    const savePattern: BehaviorPattern = {
      keywords: new Map(),
      agencies: new Map(),
      amounts: new Map(),
      categories: new Map(),
    };

    // Get passed opportunities from progress
    const progressRef = doc(db, 'profiles', userId, 'dashboard', 'progress');
    const progressDoc = await getDoc(progressRef);
    
    let passedIds: string[] = [];
    if (progressDoc.exists()) {
      passedIds = progressDoc.data().passedIds || [];
    }

    // Get saved opportunities
    const savedRef = doc(db, 'profiles', userId, 'tracker', 'saved');
    const savedDoc = await getDoc(savedRef);
    
    let savedOpportunities: Opportunity[] = [];
    if (savedDoc.exists()) {
      savedOpportunities = savedDoc.data().opportunities || [];
    }

    // Get applied opportunities
    const appliedRef = doc(db, 'profiles', userId, 'tracker', 'applied');
    const appliedDoc = await getDoc(appliedRef);
    
    let appliedOpportunities: Opportunity[] = [];
    if (appliedDoc.exists()) {
      appliedOpportunities = appliedDoc.data().opportunities || [];
    }

    // Analyze saved + applied patterns (positive signals)
    const positiveOpportunities = [...savedOpportunities, ...appliedOpportunities];
    positiveOpportunities.forEach(opp => {
      // Extract and count keywords
      const keywords = extractOpportunityKeywords(opp);
      keywords.forEach(keyword => {
        savePattern.keywords.set(keyword, (savePattern.keywords.get(keyword) || 0) + 1);
      });

      // Count agencies
      if (opp.agency) {
        savePattern.agencies.set(opp.agency, (savePattern.agencies.get(opp.agency) || 0) + 1);
      }

      // Count amounts
      if (opp.amount) {
        savePattern.amounts.set(opp.amount, (savePattern.amounts.get(opp.amount) || 0) + 1);
      }

      // Count categories
      if (opp.category) {
        savePattern.categories.set(opp.category, (savePattern.categories.get(opp.category) || 0) + 1);
      }
    });

    // Note: For passed opportunities, we'd need to store the full opportunity data
    // For now, we'll just track IDs and infer patterns from what wasn't saved

    // Convert to preferences format
    const preferences: UserPreferences = {
      passedOpportunityIds: passedIds,
      savedOpportunityIds: savedOpportunities.map(opp => opp.id),
      appliedOpportunityIds: appliedOpportunities.map(opp => opp.id),
      savePatterns: {
        keywords: getTopN(savePattern.keywords, 20),
        agencies: getTopN(savePattern.agencies, 10),
        amounts: getTopN(savePattern.amounts, 5),
      },
      passPatterns: {
        keywords: [], // Would need full opportunity data for passed items
        agencies: [],
        amounts: [],
      },
      lastAnalyzed: new Date(),
    };

    // Store updated preferences
    await updateUserPreferences(userId, preferences);

    return preferences;
  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    return {};
  }
}

// Get top N items from a frequency map
function getTopN(map: Map<string, number>, n: number): string[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item);
}

// Update user preferences in Firestore
export async function updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
  if (!db) return;

  try {
    const profileRef = doc(db, 'profiles', userId);
    await setDoc(profileRef, { preferences }, { merge: true });
    console.log('✅ User preferences updated');
  } catch (error) {
    console.error('Error updating preferences:', error);
  }
}

// Track when user passes on an opportunity
export async function trackPass(userId: string, opportunity: Opportunity): Promise<void> {
  if (!db) return;

  try {
    // Store the full passed opportunity for pattern analysis
    const passedRef = doc(db, 'profiles', userId, 'tracker', 'passed');
    const passedDoc = await getDoc(passedRef);

    const passedOpportunities = passedDoc.exists() 
      ? passedDoc.data().opportunities || []
      : [];

    // Add new passed opportunity (limit to last 50 to avoid bloat)
    passedOpportunities.unshift({
      ...opportunity,
      passedAt: new Date().toISOString(),
    });

    await setDoc(passedRef, {
      opportunities: passedOpportunities.slice(0, 50),
    });

    console.log('📊 Tracked pass for preference learning');
  } catch (error) {
    console.error('Error tracking pass:', error);
  }
}

// Track when user saves an opportunity
export async function trackSave(userId: string, opportunity: Opportunity): Promise<void> {
  // This is already handled in the dashboard, but we can trigger preference analysis
  console.log('📊 Tracked save for preference learning');
  
  // Periodically re-analyze (e.g., every 10 saves)
  // Could add a counter here
}

// Get recommendations boost based on preferences
export function getPreferenceBoost(
  opportunity: Opportunity,
  preferences: UserPreferences
): number {
  if (!preferences.savePatterns) return 0;

  let boost = 0;
  const combined = `${opportunity.title} ${opportunity.description}`.toLowerCase();

  // Boost if keywords match saved patterns
  if (preferences.savePatterns.keywords) {
    const matchedKeywords = preferences.savePatterns.keywords.filter(kw =>
      combined.includes(kw.toLowerCase())
    );
    boost += matchedKeywords.length * 0.02; // +2% per matched keyword
  }

  // Boost if agency matches saved patterns
  if (preferences.savePatterns.agencies && opportunity.agency) {
    const matchedAgency = preferences.savePatterns.agencies.some(ag =>
      opportunity.agency.toLowerCase().includes(ag.toLowerCase())
    );
    if (matchedAgency) {
      boost += 0.05; // +5% for agency match
    }
  }

  // Penalty if keywords match passed patterns
  if (preferences.passPatterns?.keywords) {
    const matchedKeywords = preferences.passPatterns.keywords.filter(kw =>
      combined.includes(kw.toLowerCase())
    );
    boost -= matchedKeywords.length * 0.01; // -1% per matched pass keyword
  }

  return Math.max(-0.2, Math.min(boost, 0.3)); // Cap between -20% and +30%
}


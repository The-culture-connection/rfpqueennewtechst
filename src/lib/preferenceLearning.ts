import { Opportunity, UserPreferences } from '@/types';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Preference Learning System
 * Analyzes user behavior (passes, saves, applies) to improve future recommendations
 */

interface BehavioralData {
  passedOpportunities: Opportunity[];
  savedOpportunities: Opportunity[];
  appliedOpportunities: Opportunity[];
}

export async function analyzeAndUpdatePreferences(
  userId: string,
  behavioralData: BehavioralData,
  db: any
): Promise<UserPreferences> {
  // Extract patterns from behavioral data
  const passPatterns = extractPatterns(behavioralData.passedOpportunities);
  const savePatterns = extractPatterns(behavioralData.savedOpportunities);
  const applyPatterns = extractPatterns(behavioralData.appliedOpportunities);
  
  const preferences: UserPreferences = {
    passedOpportunityIds: behavioralData.passedOpportunities.map(o => o.id),
    savedOpportunityIds: behavioralData.savedOpportunities.map(o => o.id),
    appliedOpportunityIds: behavioralData.appliedOpportunities.map(o => o.id),
    passPatterns: {
      keywords: passPatterns.keywords,
      agencies: passPatterns.agencies,
      amounts: passPatterns.amounts,
    },
    savePatterns: {
      keywords: savePatterns.keywords,
      agencies: savePatterns.agencies,
      amounts: savePatterns.amounts,
    },
    lastAnalyzed: new Date(),
  };
  
  // Save to Firestore
  try {
    const prefsRef = doc(db, 'profiles', userId, 'preferences', 'learned');
    await setDoc(prefsRef, preferences, { merge: true });
    console.log('✅ Preferences updated based on user behavior');
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
  
  return preferences;
}

export async function loadUserPreferences(userId: string, db: any): Promise<UserPreferences | null> {
  try {
    const prefsRef = doc(db, 'profiles', userId, 'preferences', 'learned');
    const prefsDoc = await getDoc(prefsRef);
    
    if (prefsDoc.exists()) {
      return prefsDoc.data() as UserPreferences;
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  
  return null;
}

function extractPatterns(opportunities: Opportunity[]): {
  keywords: string[];
  agencies: string[];
  amounts: string[];
} {
  const keywordFrequency: { [key: string]: number } = {};
  const agencyFrequency: { [key: string]: number } = {};
  const amounts: string[] = [];
  
  opportunities.forEach(opp => {
    // Extract keywords from title and description
    const text = `${opp.title} ${opp.description}`.toLowerCase();
    const words = extractMeaningfulWords(text);
    
    words.forEach(word => {
      keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
    });
    
    // Track agencies
    if (opp.agency) {
      agencyFrequency[opp.agency] = (agencyFrequency[opp.agency] || 0) + 1;
    }
    
    // Track amounts
    if (opp.amount) {
      amounts.push(categorizeAmount(opp.amount));
    }
  });
  
  // Get top keywords (appearing in at least 20% of opportunities or min 2 times)
  const minThreshold = Math.max(2, Math.ceil(opportunities.length * 0.2));
  const topKeywords = Object.entries(keywordFrequency)
    .filter(([_, count]) => count >= minThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
  
  // Get top agencies
  const topAgencies = Object.entries(agencyFrequency)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([agency]) => agency);
  
  // Get unique amount categories
  const uniqueAmounts = [...new Set(amounts)];
  
  return {
    keywords: topKeywords,
    agencies: topAgencies,
    amounts: uniqueAmounts,
  };
}

function extractMeaningfulWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'who', 'what', 'where', 'when', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
    'very', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'into', 'out', 'up', 'down', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'all', 'any', 'both',
  ]);
  
  const words = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !stopWords.has(word) &&
      !/^\d+$/.test(word) // Remove pure numbers
    );
  
  return words;
}

function categorizeAmount(amount: string): string {
  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
  
  if (isNaN(numericAmount)) return 'unknown';
  
  if (numericAmount < 10000) return 'under-10k';
  if (numericAmount < 25000) return '10k-25k';
  if (numericAmount < 50000) return '25k-50k';
  if (numericAmount < 100000) return '50k-100k';
  if (numericAmount < 250000) return '100k-250k';
  if (numericAmount < 500000) return '250k-500k';
  if (numericAmount < 1000000) return '500k-1m';
  return 'over-1m';
}

/**
 * Track user action and update preferences in real-time
 */
export async function trackUserAction(
  userId: string,
  opportunity: Opportunity,
  action: 'pass' | 'save' | 'apply',
  db: any
): Promise<void> {
  try {
    // Load current preferences
    const prefs = await loadUserPreferences(userId, db) || {
      passedOpportunityIds: [],
      savedOpportunityIds: [],
      appliedOpportunityIds: [],
    };
    
    // Update appropriate array
    switch (action) {
      case 'pass':
        if (!prefs.passedOpportunityIds) prefs.passedOpportunityIds = [];
        prefs.passedOpportunityIds.push(opportunity.id);
        break;
      case 'save':
        if (!prefs.savedOpportunityIds) prefs.savedOpportunityIds = [];
        prefs.savedOpportunityIds.push(opportunity.id);
        break;
      case 'apply':
        if (!prefs.appliedOpportunityIds) prefs.appliedOpportunityIds = [];
        prefs.appliedOpportunityIds.push(opportunity.id);
        break;
    }
    
    // Quick pattern update
    const pattern = extractPatterns([opportunity]);
    
    if (action === 'pass') {
      if (!prefs.passPatterns) prefs.passPatterns = { keywords: [], agencies: [], amounts: [] };
      prefs.passPatterns.keywords = [...new Set([...(prefs.passPatterns.keywords || []), ...pattern.keywords])];
      prefs.passPatterns.agencies = [...new Set([...(prefs.passPatterns.agencies || []), ...pattern.agencies])];
    } else if (action === 'save' || action === 'apply') {
      if (!prefs.savePatterns) prefs.savePatterns = { keywords: [], agencies: [], amounts: [] };
      prefs.savePatterns.keywords = [...new Set([...(prefs.savePatterns.keywords || []), ...pattern.keywords])];
      prefs.savePatterns.agencies = [...new Set([...(prefs.savePatterns.agencies || []), ...pattern.agencies])];
    }
    
    // Save updated preferences
    const prefsRef = doc(db, 'profiles', userId, 'preferences', 'learned');
    await setDoc(prefsRef, prefs, { merge: true });
    
    console.log(`✅ Tracked ${action} action and updated preferences`);
  } catch (error) {
    console.error('Error tracking user action:', error);
  }
}

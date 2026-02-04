import { useState, useEffect } from 'react';
import { Opportunity, UserProfile } from '@/types';
import { matchOpportunities } from '@/lib/matchAlgorithm';
import { enhancedMatchOpportunities } from '@/lib/enhancedMatchAlgorithm';
import { advancedMatchOpportunities } from '@/lib/advancedMatchAlgorithm';
import { intelligentMatchOpportunities } from '@/lib/intelligentMatchAlgorithm';
import { loadUserPreferences } from '@/lib/preferenceLearning';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  getCachedOpportunities, 
  saveCachedOpportunities,
  invalidateOpportunityCache 
} from '@/lib/opportunityCache';

// LocalStorage cache keys (fallback)
const CACHE_KEY = 'cached_opportunities';
const CACHE_TIMESTAMP_KEY = 'cached_opportunities_timestamp';
const CACHE_PROFILE_KEY = 'cached_opportunities_profile';

export function useOpportunities(profile: UserProfile | null, forceReload: boolean = false) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matchedOpportunities, setMatchedOpportunities] = useState<Opportunity[]>([]);
  const [unknownEligibilityOpportunities, setUnknownEligibilityOpportunities] = useState<Opportunity[]>([]); // NEW: Unknown eligibility bucket
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastProfileHash, setLastProfileHash] = useState<string | null>(null);

  // Create a stable profile hash for dependency checking
  const profileHash = profile ? JSON.stringify({
    uid: profile.uid,
    fundingType: profile.fundingType,
    interestsMain: profile.interestsMain,
    keywords: profile.keywords,
    entityType: profile.entityType,
    timeline: profile.timeline,
  }) : null;

  useEffect(() => {
    async function loadAndMatchOpportunities() {
      if (!profile || !profile.uid) {
        setLoading(false);
        return;
      }

      // NEW: Check if matching should run using new system
      if (!forceReload) {
        try {
          const shouldRunResponse = await fetch(`/api/should-run-matching?userId=${profile.uid}`);
          const shouldRunData = await shouldRunResponse.json();
          
          if (shouldRunData.shouldRun) {
            // Will run matching below
          } else {
            // Try to load current matches from new system
            try {
              // Try to load from profiles collection first (primary location)
              let currentMatches: any = null;
              const profileRef = doc(db, 'profiles', profile.uid);
              const profileDoc = await getDoc(profileRef);
              
              if (profileDoc.exists() && profileDoc.data()?.currentMatches) {
                currentMatches = profileDoc.data()?.currentMatches;
              } else {
                // Fallback to userMatches collection
                const currentMatchesRef = doc(db, 'userMatches', profile.uid, 'current', 'latest');
                const currentMatchesDoc = await getDoc(currentMatchesRef);
                if (currentMatchesDoc.exists()) {
                  currentMatches = currentMatchesDoc.data();
                }
              }
              
              if (currentMatches && currentMatches.topMatches) {
                
                // Load full opportunity data
                const opportunitiesResponse = await fetch(
                  `/api/opportunities?limit=1000&hasDeadline=false&fundingTypes=${(profile.fundingType || []).join(',')}`
                );
                const opportunitiesData = await opportunitiesResponse.json();
                const allOpps = opportunitiesData.opportunities || [];
                
                // Map matches to opportunities
                const matched = (currentMatches.topMatches || [])
                  .map((match: any) => {
                    const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                    if (!opp) return null;
                    
                    // Handle eligibilityNotes - can be array or string
                    const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                      ? match.notes.eligibilityNotes
                      : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                    
                    // Use new eligibility structure if available
                    const eligibility = match.eligibility || match.eligibilityGate;
                    
                    return {
                      ...opp,
                      winRate: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      matchScore: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                      matchReasoning: {
                        summary: match.notes?.matchSummary || '',
                        strengths: [],
                        concerns: [],
                        specificReasons: eligibility?.reasons || match.eligibilityGate?.reasons || [],
                        eligibilityHighlights: eligibilityNotes,
                        confidenceScore: match.confidenceScore || 0,
                      },
                      // Add eligibility status fields
                      eligibilityStatus: eligibility?.status || (match.eligibilityGate?.eligible ? 'eligible' : 'unknown'),
                      eligibilityBlockers: eligibility?.blockers || [],
                      eligibilityEvidence: eligibility?.evidence || [],
                    };
                  })
                  .filter(Boolean) as Opportunity[];
                
                // Sort by ranking score (AI-refined scores should be highest)
                matched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
                
                setOpportunities(allOpps);
                setMatchedOpportunities(matched);
                setUnknownEligibilityOpportunities([]); // No unknown matches when loading from cache
                setLoading(false);
                setLastProfileHash(profileHash);
                return;
              }
            } catch (err) {
              // Silently fail and continue
            }
          }
        } catch (err) {
          // Silently fail and continue
        }
      }

      // Skip if profile hasn't changed and this isn't a forced reload or manual refresh
      // This prevents rerunning when navigating back to the dashboard
      if (profileHash === lastProfileHash && !forceReload && refreshTrigger === 0 && opportunities.length > 0) {
        setLoading(false);
        return;
      }

      // Check Firestore cache first (unless force reload) - OLD SYSTEM
      if (!forceReload) {
        try {
          const cached = await getCachedOpportunities(profile.uid, profile);
          if (cached) {
            setOpportunities(cached.allOpportunities);
                setMatchedOpportunities(cached.matchedOpportunities);
                setUnknownEligibilityOpportunities([]); // Cache doesn't have unknown matches yet
            setLoading(false);
            setLastProfileHash(profileHash);
            return;
          }
        } catch (err) {
          // Silently fail cache reads
        }

        // Fallback to localStorage cache
        if (typeof window !== 'undefined') {
          try {
            const cached = localStorage.getItem(CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const cachedProfile = localStorage.getItem(CACHE_PROFILE_KEY);
            
            // Use cache if it exists, is less than 24 hours old, and profile hasn't changed
            if (cached && cachedTimestamp && cachedProfile) {
              const timestamp = parseInt(cachedTimestamp);
              const now = Date.now();
              const profileHash = JSON.stringify({
                fundingType: profile.fundingType,
                interestsMain: profile.interestsMain,
                keywords: profile.keywords,
              });
              
              // Cache valid for 24 hours and profile hasn't changed
              if (now - timestamp < 24 * 60 * 60 * 1000 && cachedProfile === profileHash) {
                const parsed = JSON.parse(cached);
                setOpportunities(parsed.allOpps || []);
                setMatchedOpportunities(parsed.matched || []);
                setUnknownEligibilityOpportunities([]); // localStorage doesn't have unknown matches
                setLoading(false);
                setLastProfileHash(profileHash);
                return;
              }
            }
          } catch (err) {
            // Silently fail cache reads
          }
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Build query params - only load CSVs matching user's funding types
        // Safety check: if fundingType is undefined or empty, default to all types
        const fundingTypes = profile.fundingType && profile.fundingType.length > 0 
          ? profile.fundingType 
          : ['grants', 'rfps', 'contracts'];
        const fundingTypesParam = fundingTypes.join(',');
        const url = `/api/opportunities?limit=1000&hasDeadline=false&fundingTypes=${fundingTypesParam}`;
        
        // Load opportunities from API - filtered by funding type
        const response = await fetch(url);
        
        if (!response.ok) {
          // Provide more detailed error messages for 404s
          if (response.status === 404) {
            throw new Error(`API route not found (404). The route /api/opportunities may not be deployed. Check Vercel logs.`);
          }
          
          throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const allOpps = data.opportunities || [];
        
        setOpportunities(allOpps);

        // Load business profile and preferences for enhanced matching
        let enrichedProfile = { ...profile };
        if (db) {
          try {
            const businessProfileRef = doc(db, 'profiles', profile.uid, 'businessProfile', 'master');
            const businessProfileDoc = await getDoc(businessProfileRef);
            
            if (businessProfileDoc.exists()) {
              enrichedProfile.businessProfile = businessProfileDoc.data() as any;
            }

            // Load user preferences for behavioral learning
            const preferences = await loadUserPreferences(profile.uid, db);
            if (preferences) {
              enrichedProfile.preferences = preferences;
            }
          } catch (err) {
            // Silently fail - these are optional enhancements
          }
        }

        // NEW: Check if we should use new matching system
        const shouldRunResponse = await fetch(`/api/should-run-matching?userId=${profile.uid}`);
        const shouldRunData = await shouldRunResponse.json();
        
        // Declare matched at higher scope so it's available for caching
        let matched: Opportunity[] = [];
        
        if (shouldRunData.shouldRun || forceReload) {
          // Use new production matching system
          console.log(`[MATCHING][CLIENT] shouldRun=${shouldRunData.shouldRun}, reason=${shouldRunData.reason || 'FIRST_DASHBOARD'}, forceReload=${forceReload}`);
          setLoading(true);
          
          const runResponse = await fetch('/api/run-matching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.uid,
              trigger: shouldRunData.reason || 'FIRST_DASHBOARD',
              forceRun: forceReload,
            }),
          });
          
          if (runResponse.ok) {
            const runData = await runResponse.json();
            console.log(`[MATCHING][CLIENT] runData keys:`, Object.keys(runData));
            console.log(`[MATCHING][CLIENT] runData.opportunities length:`, runData.opportunities?.length || 0);
            console.log(`[MATCHING][CLIENT] runData.unknownOpportunities length:`, runData.unknownOpportunities?.length || 0);
            console.log(`[MATCHING][CLIENT] runData.matchesCount:`, runData.matchesCount);
            console.log(`✅ [MATCHING] Complete: ${runData.matchesCount} eligible, ${runData.unknownOpportunities?.length || 0} unknown`);
            
            // CRITICAL FIX: Use the data directly from the API response first!
            // The API already returns the full opportunity objects with all match data
            if (runData.opportunities && runData.opportunities.length > 0) {
              console.log(`✅ [MATCHING] Using opportunities directly from API response: ${runData.opportunities.length} eligible`);
              matched = runData.opportunities;
              setMatchedOpportunities(matched);
              
              // Set unknown opportunities if available
              if (runData.unknownOpportunities && runData.unknownOpportunities.length > 0) {
                console.log(`✅ [MATCHING] Using unknown opportunities from API response: ${runData.unknownOpportunities.length}`);
                setUnknownEligibilityOpportunities(runData.unknownOpportunities);
              } else {
                setUnknownEligibilityOpportunities([]);
              }
              
              // Data is already set, we can continue
            } else {
              // Fallback: Try to load from Firestore if API didn't return data
              console.log(`⚠️ [MATCHING] API response had no opportunities, trying Firestore...`);
              
              // Wait a bit for Firestore to propagate the saved matches
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Try to load from profiles collection first (primary location) with retry
              let currentMatches: any = null;
              let retries = 5;
              
              while (retries > 0 && !currentMatches) {
                try {
                  const profileRef = doc(db, 'profiles', profile.uid);
                  const profileDoc = await getDoc(profileRef);
                  
                  if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    if (profileData?.currentMatches) {
                      currentMatches = profileData.currentMatches;
                      console.log(`✅ [MATCHING] Loaded matches from profiles collection: ${currentMatches.topMatches?.length || 0} eligible, ${currentMatches.unknownEligibilityMatches?.length || 0} unknown`);
                    }
                  }
                  
                  // Fallback to userMatches collection if not found in profiles
                  if (!currentMatches) {
                    const currentMatchesRef = doc(db, 'userMatches', profile.uid, 'current', 'latest');
                    const currentMatchesDoc = await getDoc(currentMatchesRef);
                    if (currentMatchesDoc.exists()) {
                      currentMatches = currentMatchesDoc.data();
                      console.log(`✅ [MATCHING] Loaded matches from userMatches collection: ${currentMatches.topMatches?.length || 0} eligible`);
                    }
                  }
                } catch (err: any) {
                  console.error(`❌ [MATCHING] Error loading matches (attempt ${6 - retries}):`, err.message);
                }
                
                if (!currentMatches && retries > 1) {
                  console.log(`⏳ [MATCHING] Matches not found, retrying in 1s... (${retries - 1} attempts left)`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                retries--;
              }
              
              if (currentMatches && currentMatches.topMatches) {
                console.log(`📊 [MATCHING] Processing ${currentMatches.topMatches.length} top matches from Firestore`);
                
                // Track mapping failures
                let mappingFailures = 0;
                const missingIds: string[] = [];
                
                // Map eligible matches
                matched = (currentMatches.topMatches || [])
                  .map((match: any) => {
                    const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                    if (!opp) {
                      mappingFailures++;
                      if (missingIds.length < 5) {
                        missingIds.push(match.opportunityId);
                      }
                      console.warn(`⚠️ [MATCHING] Opportunity not found in allOpps: ${match.opportunityId}`);
                      return null;
                    }
                    
                    const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                      ? match.notes.eligibilityNotes
                      : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                    
                    const eligibility = match.eligibility || match.eligibilityGate;
                    
                    return {
                      ...opp,
                      winRate: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      matchScore: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                      matchReasoning: {
                        summary: match.notes?.matchSummary || '',
                        strengths: [],
                        concerns: [],
                        specificReasons: eligibility?.reasons || match.eligibilityGate?.reasons || [],
                        eligibilityHighlights: eligibilityNotes,
                        confidenceScore: match.confidenceScore || 0,
                      },
                      eligibilityStatus: eligibility?.status || (match.eligibilityGate?.eligible ? 'eligible' : 'unknown'),
                      eligibilityBlockers: eligibility?.blockers || [],
                      eligibilityEvidence: eligibility?.evidence || [],
                    };
                  })
                  .filter(Boolean) as Opportunity[];
                
                console.log(`[MATCHING][CLIENT] mapping failures ${mappingFailures}/${currentMatches.topMatches.length}, sample missing IDs:`, missingIds.slice(0, 3));
                
                matched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
                setMatchedOpportunities(matched);
                
                // Load unknown eligibility matches
                if (currentMatches.unknownEligibilityMatches && currentMatches.unknownEligibilityMatches.length > 0) {
                  const unknownMatched = currentMatches.unknownEligibilityMatches
                    .map((match: any) => {
                      const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                      if (!opp) return null;
                      
                      const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                        ? match.notes.eligibilityNotes
                        : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                      
                      const eligibility = match.eligibility || match.eligibilityGate;
                      
                      return {
                        ...opp,
                        winRate: match.scores?.rankingScore || 0,
                        matchScore: match.scores?.rankingScore || 0,
                        eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                        matchReasoning: {
                          summary: match.notes?.matchSummary || '',
                          strengths: [],
                          concerns: [],
                          specificReasons: eligibility?.reasons || [],
                          eligibilityHighlights: eligibilityNotes,
                          confidenceScore: match.confidenceScore || 0,
                        },
                        eligibilityStatus: eligibility?.status || 'unknown',
                        eligibilityBlockers: eligibility?.blockers || [],
                        eligibilityEvidence: eligibility?.evidence || [],
                      };
                    })
                    .filter(Boolean) as Opportunity[];
                  
                  unknownMatched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
                  setUnknownEligibilityOpportunities(unknownMatched);
                } else {
                  setUnknownEligibilityOpportunities([]);
                }
              } else {
                // Final fallback to old system
                console.warn('⚠️  [FALLBACK] No matches found in API response or Firestore, using old system');
                const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
                matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
                setMatchedOpportunities(matched);
                setUnknownEligibilityOpportunities([]);
              }
            }
          } else {
            // Fallback to old system on error
            console.warn('⚠️  [FALLBACK] New matching system failed, using old system');
            const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
            matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
            setMatchedOpportunities(matched);
            setUnknownEligibilityOpportunities([]);
          }
        } else {
          // Load existing matches from Firestore (shouldRun is false - matches already exist)
          console.log('📂 [MATCHING] Loading existing matches from Firestore (shouldRun=false)');
          
          // Try to load from profiles collection first (primary location)
          let currentMatches: any = null;
          const profileRef = doc(db, 'profiles', profile.uid);
          const profileDoc = await getDoc(profileRef);
          
          if (profileDoc.exists() && profileDoc.data()?.currentMatches) {
            currentMatches = profileDoc.data()?.currentMatches;
            console.log(`✅ [MATCHING] Loaded matches from profiles collection: ${currentMatches.topMatches?.length || 0} eligible`);
          } else {
            // Fallback to userMatches collection
            const currentMatchesRef = doc(db, 'userMatches', profile.uid, 'current', 'latest');
            const currentMatchesDoc = await getDoc(currentMatchesRef);
            if (currentMatchesDoc.exists()) {
              currentMatches = currentMatchesDoc.data();
              console.log(`✅ [MATCHING] Loaded matches from userMatches collection: ${currentMatches.topMatches?.length || 0} eligible`);
            }
          }
          
          if (currentMatches && currentMatches.topMatches) {
            console.log(`📊 [MATCHING] Processing ${currentMatches.topMatches.length} top matches, ${allOpps.length} total opportunities available`);
            
            // Debug: Log first few match IDs and opportunity IDs
            if (currentMatches.topMatches.length > 0) {
              const matchIds = currentMatches.topMatches.slice(0, 5).map((m: any) => m.opportunityId);
              const oppIds = allOpps.slice(0, 5).map((o: Opportunity) => o.id);
              console.log(`🔍 [MATCHING] Sample match IDs:`, matchIds);
              console.log(`🔍 [MATCHING] Sample opportunity IDs:`, oppIds);
            }
            
            // Map eligible matches (ONLY these go to main display)
            matched = (currentMatches.topMatches || [])
              .map((match: any) => {
                const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                if (!opp) {
                  console.warn(`⚠️ [MATCHING] Opportunity not found in allOpps: ${match.opportunityId}`);
                  return null;
                }
                
                // Handle eligibilityNotes - can be array or string
                const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                  ? match.notes.eligibilityNotes
                  : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                
                // Use new eligibility structure if available
                const eligibility = match.eligibility || match.eligibilityGate;
                
                return {
                  ...opp,
                  winRate: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                  matchScore: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                  eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                  matchReasoning: {
                    summary: match.notes?.matchSummary || '',
                    strengths: [],
                    concerns: [],
                    specificReasons: eligibility?.reasons || match.eligibilityGate?.reasons || [],
                    eligibilityHighlights: eligibilityNotes,
                    confidenceScore: match.confidenceScore || 0,
                  },
                  // Add eligibility status fields
                  eligibilityStatus: eligibility?.status || (match.eligibilityGate?.eligible ? 'eligible' : 'unknown'),
                  eligibilityBlockers: eligibility?.blockers || [],
                  eligibilityEvidence: eligibility?.evidence || [],
                };
              })
              .filter(Boolean) as Opportunity[];
            
            // Sort by ranking score
            matched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
            
            setMatchedOpportunities(matched);
            console.log(`✅ [MATCHING] Loaded ${matched.length} eligible matches from Firestore`);
            
            // Load unknown eligibility matches if available
            if (currentMatches.unknownEligibilityMatches && currentMatches.unknownEligibilityMatches.length > 0) {
              const unknownMatched = currentMatches.unknownEligibilityMatches
                .map((match: any) => {
                  const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                  if (!opp) return null;
                  
                  const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                    ? match.notes.eligibilityNotes
                    : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                  
                  const eligibility = match.eligibility || match.eligibilityGate;
                  
                  return {
                    ...opp,
                    winRate: match.scores?.rankingScore || 0,
                    matchScore: match.scores?.rankingScore || 0,
                    eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                    matchReasoning: {
                      summary: match.notes?.matchSummary || '',
                      strengths: [],
                      concerns: [],
                      specificReasons: eligibility?.reasons || [],
                      eligibilityHighlights: eligibilityNotes,
                      confidenceScore: match.confidenceScore || 0,
                    },
                    eligibilityStatus: eligibility?.status || 'unknown',
                    eligibilityBlockers: eligibility?.blockers || [],
                    eligibilityEvidence: eligibility?.evidence || [],
                  };
                })
                .filter(Boolean) as Opportunity[];
              
              unknownMatched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
              setUnknownEligibilityOpportunities(unknownMatched);
              console.log(`✅ [MATCHING] Loaded ${unknownMatched.length} unknown eligibility matches from Firestore`);
            } else {
              setUnknownEligibilityOpportunities([]);
            }
          } else {
            // No existing matches found - use old system as fallback
            console.warn('⚠️  [FALLBACK] No existing matches found in Firestore, using old intelligent matching system');
            const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
            matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
            setMatchedOpportunities(matched);
            setUnknownEligibilityOpportunities([]);
          }
        }

        // Cache the results in Firestore (primary cache)
        if (profile.uid) {
          try {
            await saveCachedOpportunities(profile.uid, enrichedProfile, allOpps, matched);
          } catch (err) {
            // Silently fail cache writes
          }
        }

        // Also cache in localStorage as fallback
        if (typeof window !== 'undefined') {
          try {
            const profileHash = JSON.stringify({
              fundingType: profile.fundingType,
              interestsMain: profile.interestsMain,
              keywords: profile.keywords,
              hasBusinessProfile: !!enrichedProfile.businessProfile,
              hasPreferences: !!enrichedProfile.preferences,
            });
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              allOpps,
              matched,
            }));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            localStorage.setItem(CACHE_PROFILE_KEY, profileHash);
          } catch (err) {
            // Silently fail cache writes
          }
        }

        // Log final results
        console.log(`✅ [COMPLETE] ${allOpps.length} opportunities, ${matched.length} eligible matches, ${unknownEligibilityOpportunities.length} unknown eligibility`);
        setLastProfileHash(profileHash);
        } catch (err: any) {
        console.error(`❌ [ERROR] Failed to load opportunities: ${err.message}`);
        setError(`Failed to load opportunities: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadAndMatchOpportunities();
    // Only depend on profileHash (stable), refreshTrigger (manual), and forceReload (manual)
    // hasLoadedCache is managed internally and shouldn't trigger reruns
  }, [profileHash, refreshTrigger, forceReload]);

  const refetch = () => {
    // Reset profile hash to force reload
    setLastProfileHash(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    opportunities: matchedOpportunities, // Eligible matches only (for backward compatibility)
    matchedOpportunities, // Eligible matches
    unknownEligibilityOpportunities, // Unknown eligibility bucket
    loading,
    error,
    refetch,
  };
}



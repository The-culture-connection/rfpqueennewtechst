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
            console.log(`[useOpportunities] Matching should run (reason: ${shouldRunData.reason})`);
            // Will run matching below
          } else {
            // Try to load current matches from new system
            console.log('[useOpportunities] Matching not needed, loading current matches...');
            try {
              // Try to load from profiles collection first (primary location)
              let currentMatches: any = null;
              const profileRef = doc(db, 'profiles', profile.uid);
              const profileDoc = await getDoc(profileRef);
              
              if (profileDoc.exists() && profileDoc.data()?.currentMatches) {
                currentMatches = profileDoc.data()?.currentMatches;
                console.log(`[useOpportunities] Found ${currentMatches?.topMatches?.length || 0} current matches in profiles collection`);
              } else {
                // Fallback to userMatches collection
                const currentMatchesRef = doc(db, 'userMatches', profile.uid, 'current', 'latest');
                const currentMatchesDoc = await getDoc(currentMatchesRef);
                if (currentMatchesDoc.exists()) {
                  currentMatches = currentMatchesDoc.data();
                  console.log(`[useOpportunities] Found ${currentMatches?.topMatches?.length || 0} current matches in userMatches collection`);
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
                    
                    return {
                      ...opp,
                      winRate: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      matchScore: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                      eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                      matchReasoning: {
                        summary: match.notes?.matchSummary || '',
                        strengths: [],
                        concerns: [],
                        specificReasons: match.eligibilityGate?.reasons || [],
                        eligibilityHighlights: eligibilityNotes,
                        confidenceScore: match.confidenceScore || 0,
                      },
                    };
                  })
                  .filter(Boolean) as Opportunity[];
                
                // Sort by ranking score (AI-refined scores should be highest)
                matched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
                
                setOpportunities(allOpps);
                setMatchedOpportunities(matched);
                setLoading(false);
                setLastProfileHash(profileHash);
                console.log(`✅ Loaded ${matched.length} matches from new system`);
                return;
              }
            } catch (err) {
              console.warn('[useOpportunities] Error loading current matches, falling back to old system:', err);
            }
          }
        } catch (err) {
          console.warn('[useOpportunities] Error checking shouldRunMatching, using old system:', err);
        }
      }

      // Skip if profile hasn't changed and this isn't a forced reload or manual refresh
      // This prevents rerunning when navigating back to the dashboard
      if (profileHash === lastProfileHash && !forceReload && refreshTrigger === 0 && opportunities.length > 0) {
        setLoading(false);
        console.log('✅ Skipping reload - using existing opportunities (profile unchanged)');
        return;
      }

      // Check Firestore cache first (unless force reload) - OLD SYSTEM
      if (!forceReload) {
        try {
          const cached = await getCachedOpportunities(profile.uid, profile);
          if (cached) {
            setOpportunities(cached.allOpportunities);
            setMatchedOpportunities(cached.matchedOpportunities);
            setLoading(false);
            setLastProfileHash(profileHash);
            console.log('✅ Using Firestore cached opportunities (old system)');
            return;
          }
        } catch (err) {
          console.warn('[Cache] Error reading Firestore cache:', err);
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
                setLoading(false);
                setLastProfileHash(profileHash);
                console.log('✅ Using localStorage cached opportunities');
                return;
              }
            }
          } catch (err) {
            console.warn('[Cache] Error reading localStorage cache:', err);
          }
        }
      }

      setLoading(true);
      setError(null);

      try {
        console.log('Starting to load opportunities...');
        console.log('User funding types:', profile.fundingType);
        
        // Build query params - only load CSVs matching user's funding types
        // Safety check: if fundingType is undefined or empty, default to all types
        const fundingTypes = profile.fundingType && profile.fundingType.length > 0 
          ? profile.fundingType 
          : ['grants', 'rfps', 'contracts'];
        const fundingTypesParam = fundingTypes.join(',');
        const url = `/api/opportunities?limit=1000&hasDeadline=false&fundingTypes=${fundingTypesParam}`;
        
        console.log('Fetching from:', url);
        
        // Load opportunities from API - filtered by funding type
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response URL:', response.url);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response not OK:', errorText);
          console.error('Response status:', response.status);
          console.error('Response statusText:', response.statusText);
          
          // Provide more detailed error messages for 404s
          if (response.status === 404) {
            throw new Error(`API route not found (404). The route /api/opportunities may not be deployed. Check Vercel logs.`);
          }
          
          throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}`);
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('JSON parsed successfully', data);
        
        const allOpps = data.opportunities || [];
        console.log(`Received ${allOpps.length} opportunities from API`);
        
        setOpportunities(allOpps);

        // Load business profile and preferences for enhanced matching
        let enrichedProfile = { ...profile };
        if (db) {
          try {
            const businessProfileRef = doc(db, 'profiles', profile.uid, 'businessProfile', 'master');
            const businessProfileDoc = await getDoc(businessProfileRef);
            
            if (businessProfileDoc.exists()) {
              enrichedProfile.businessProfile = businessProfileDoc.data() as any;
              console.log('✅ Loaded business profile for enhanced matching');
            }

            // Load user preferences for behavioral learning
            const preferences = await loadUserPreferences(profile.uid, db);
            if (preferences) {
              enrichedProfile.preferences = preferences;
              console.log('✅ Loaded user preferences for enhanced matching');
            }
          } catch (err) {
            console.warn('Could not load business profile or preferences:', err);
          }
        }

        // NEW: Check if we should use new matching system
        const shouldRunResponse = await fetch(`/api/should-run-matching?userId=${profile.uid}`);
        const shouldRunData = await shouldRunResponse.json();
        
        // Declare matched at higher scope so it's available for caching
        let matched: Opportunity[] = [];
        
        if (shouldRunData.shouldRun || forceReload) {
          // Use new production matching system
          console.log('🚀 [useOpportunities] Using NEW production matching system...');
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
            console.log(`✅ [useOpportunities] New matching complete: ${runData.matchesCount} matches`);
            
            // Try to load from profiles collection first (primary location)
            let currentMatches: any = null;
            const profileRef = doc(db, 'profiles', profile.uid);
            const profileDoc = await getDoc(profileRef);
            
            if (profileDoc.exists() && profileDoc.data()?.currentMatches) {
              currentMatches = profileDoc.data()?.currentMatches;
              console.log('✅ [useOpportunities] Loaded matches from profiles collection');
            } else {
              // Fallback to userMatches collection
              const currentMatchesRef = doc(db, 'userMatches', profile.uid, 'current', 'latest');
              const currentMatchesDoc = await getDoc(currentMatchesRef);
              if (currentMatchesDoc.exists()) {
                currentMatches = currentMatchesDoc.data();
                console.log('✅ [useOpportunities] Loaded matches from userMatches collection');
              }
            }
            
            if (currentMatches && currentMatches.topMatches) {
              matched = (currentMatches.topMatches || [])
                .map((match: any) => {
                  const opp = allOpps.find((o: Opportunity) => o.id === match.opportunityId);
                  if (!opp) return null;
                  
                  // Handle eligibilityNotes - can be array or string
                  const eligibilityNotes = Array.isArray(match.notes?.eligibilityNotes)
                    ? match.notes.eligibilityNotes
                    : (match.notes?.eligibilityNotes ? [match.notes.eligibilityNotes] : []);
                  
                  return {
                    ...opp,
                    winRate: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                    matchScore: match.scores?.rankingScore || match.scores?.fitScore * 100 || 0,
                    eligibilityNotes: eligibilityNotes.length > 0 ? eligibilityNotes : undefined,
                    matchReasoning: {
                      summary: match.notes?.matchSummary || '',
                      strengths: [],
                      concerns: [],
                      specificReasons: match.eligibilityGate?.reasons || [],
                      eligibilityHighlights: eligibilityNotes,
                      confidenceScore: match.confidenceScore || 0,
                    },
                  };
                })
                .filter(Boolean) as Opportunity[];
              
              // Sort by ranking score (AI-refined scores should be highest)
              matched.sort((a, b) => (b.matchScore || b.winRate || 0) - (a.matchScore || a.winRate || 0));
              
              setMatchedOpportunities(matched);
              console.log(`✅ [useOpportunities] Loaded ${matched.length} AI-refined matches from new system`);
            } else {
              // Fallback to old system if new system didn't save matches
              console.warn('[useOpportunities] New system completed but no matches found, using old system');
              const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
              matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
              setMatchedOpportunities(matched);
            }
          } else {
            // Fallback to old system on error
            console.warn('[useOpportunities] New matching system failed, using old system');
            const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
            matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
            setMatchedOpportunities(matched);
          }
        } else {
          // Use old intelligent matching system (backward compatibility)
          console.log('🧠 [useOpportunities] Using OLD intelligent matching system...');
          const matchedResults = await intelligentMatchOpportunities(allOpps, enrichedProfile, profile.uid, true);
          matched = matchedResults.filter(opp => (opp.matchScore || opp.winRate || 0) >= 35);
          console.log(`✅ Matched ${matched.length} opportunities (35%+ score) with intelligent analysis and AI refinement`);
          setMatchedOpportunities(matched);
        }

        // Cache the results in Firestore (primary cache)
        if (profile.uid) {
          try {
            await saveCachedOpportunities(profile.uid, enrichedProfile, allOpps, matched);
          } catch (err) {
            console.warn('[Cache] Error saving to Firestore, using localStorage fallback:', err);
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
            console.log('✅ Cached opportunities in localStorage (fallback)');
          } catch (err) {
            console.warn('[Cache] Error caching in localStorage:', err);
          }
        }

        console.log(`✅ Successfully loaded ${allOpps.length} total opportunities`);
        console.log(`✅ Enhanced matched ${matched.length} opportunities with personalized insights`);
        setLastProfileHash(profileHash);
      } catch (err: any) {
        console.error('❌ Error loading opportunities:', err);
        console.error('Error details:', err.message, err.stack);
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
    opportunities: matchedOpportunities,
    allOpportunities: opportunities,
    loading,
    error,
    refetch,
  };
}



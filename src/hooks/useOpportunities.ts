import { useState, useEffect } from 'react';
import { Opportunity, UserProfile } from '@/types';
import { matchOpportunities } from '@/lib/matchAlgorithm';
import { enhancedMatchOpportunities } from '@/lib/enhancedMatchAlgorithm';
import { advancedMatchOpportunities } from '@/lib/advancedMatchAlgorithm';
import { intelligentMatchOpportunities } from '@/lib/intelligentMatchAlgorithm';
import { loadUserPreferences } from '@/lib/preferenceLearning';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Cache key for storing opportunities
const CACHE_KEY = 'cached_opportunities';
const CACHE_TIMESTAMP_KEY = 'cached_opportunities_timestamp';
const CACHE_PROFILE_KEY = 'cached_opportunities_profile';

export function useOpportunities(profile: UserProfile | null, forceReload: boolean = false) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matchedOpportunities, setMatchedOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadAndMatchOpportunities() {
      if (!profile) {
        setLoading(false);
        return;
      }

      // Check cache first (unless force reload)
      if (!forceReload && typeof window !== 'undefined') {
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
              console.log('✅ Using cached opportunities');
              return;
            }
          }
        } catch (err) {
          console.warn('Error reading cache:', err);
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

        console.log('🧠 Starting intelligent AI-powered opportunity matching...');
        // Use intelligent matching algorithm with personalized descriptions
        const matched = intelligentMatchOpportunities(allOpps, enrichedProfile)
          .filter(opp => (opp.matchScore || 0) >= 35); // 35% minimum score
        console.log(`✅ Matched ${matched.length} opportunities (35%+ score) with intelligent analysis`);
        
        setMatchedOpportunities(matched);

        // Cache the results
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
            console.log('✅ Cached opportunities with enhanced matching data');
          } catch (err) {
            console.warn('Error caching opportunities:', err);
          }
        }

        console.log(`✅ Successfully loaded ${allOpps.length} total opportunities`);
        console.log(`✅ Enhanced matched ${matched.length} opportunities with personalized insights`);
      } catch (err: any) {
        console.error('❌ Error loading opportunities:', err);
        console.error('Error details:', err.message, err.stack);
        setError(`Failed to load opportunities: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadAndMatchOpportunities();
  }, [profile, refreshTrigger, forceReload]);

  const refetch = () => {
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


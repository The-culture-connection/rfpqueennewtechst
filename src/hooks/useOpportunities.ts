import { useState, useEffect } from 'react';
import { Opportunity, UserProfile } from '@/types';
import { matchOpportunities } from '@/lib/matchAlgorithm';

export function useOpportunities(profile: UserProfile | null) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matchedOpportunities, setMatchedOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndMatchOpportunities() {
      if (!profile) {
        setLoading(false);
        return;
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

        console.log('Starting to match opportunities...');
        // Match and score opportunities based on user profile
        const matched = matchOpportunities(allOpps, profile, 0); // Show all opportunities, sorted by match
        console.log(`Matched ${matched.length} opportunities (all matches, sorted by relevance)`);
        
        setMatchedOpportunities(matched);

        console.log(`✅ Successfully loaded ${allOpps.length} total opportunities`);
        console.log(`✅ Matched ${matched.length} opportunities (30%+ win rate)`);
      } catch (err: any) {
        console.error('❌ Error loading opportunities:', err);
        console.error('Error details:', err.message, err.stack);
        setError(`Failed to load opportunities: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadAndMatchOpportunities();
  }, [profile]);

  return {
    opportunities: matchedOpportunities,
    allOpportunities: opportunities,
    loading,
    error,
  };
}


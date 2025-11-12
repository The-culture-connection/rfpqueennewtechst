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
        const fundingTypesParam = profile.fundingType.join(',');
        const url = `/api/opportunities?limit=5000&hasDeadline=false&fundingTypes=${fundingTypesParam}`;
        
        console.log('Fetching from:', url);
        
        // Load opportunities from API - filtered by funding type
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response not OK:', errorText);
          throw new Error(`Failed to fetch opportunities: ${response.status}`);
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('JSON parsed successfully', data);
        
        const allOpps = data.opportunities || [];
        console.log(`Received ${allOpps.length} opportunities from API`);
        
        setOpportunities(allOpps);

        console.log('Starting to match opportunities...');
        // Match and score opportunities based on user profile
        const matched = matchOpportunities(allOpps, profile, 30); // Min 30% win rate
        console.log(`Matched ${matched.length} opportunities (30%+ win rate)`);
        
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


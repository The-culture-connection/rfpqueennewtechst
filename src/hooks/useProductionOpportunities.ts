// New production-grade opportunities hook
// Uses the new matching system with version tracking and conditional execution

import { useState, useEffect } from 'react';
import { Opportunity, UserProfile, CurrentMatches, TopMatch } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useProductionOpportunities(profile: UserProfile | null) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    async function loadOpportunities() {
      if (!profile || !profile.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Step 1: Check if matching should run
        const shouldRunResponse = await fetch(`/api/should-run-matching?userId=${profile.uid}`);
        const shouldRunData = await shouldRunResponse.json();

        console.log('[useProductionOpportunities] Should run matching:', shouldRunData);

        if (shouldRunData.shouldRun) {
          // Step 2: Run matching
          console.log(`[useProductionOpportunities] Running matching (reason: ${shouldRunData.reason})`);
          setMatching(true);

          const runResponse = await fetch('/api/run-matching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.uid,
              trigger: shouldRunData.reason,
            }),
          });

          if (!runResponse.ok) {
            throw new Error('Failed to run matching');
          }

          const runData = await runResponse.json();
          console.log(`[useProductionOpportunities] Matching complete: ${runData.matchesCount} matches`);

          // Step 3: Load current matches
          await loadCurrentMatches(profile.uid);
        } else {
          // Step 3: Load existing matches
          await loadCurrentMatches(profile.uid);
        }
      } catch (err: any) {
        console.error('[useProductionOpportunities] Error:', err);
        setError(`Failed to load opportunities: ${err.message}`);
      } finally {
        setLoading(false);
        setMatching(false);
      }
    }

    async function loadCurrentMatches(userId: string) {
      try {
        // Load from Firestore
        const currentMatchesRef = doc(db, 'userMatches', userId, 'current', 'latest');
        const currentMatchesDoc = await getDoc(currentMatchesRef);

        if (currentMatchesDoc.exists()) {
          const currentMatches = currentMatchesDoc.data() as CurrentMatches;
          
          // Load full opportunity data for each match
          // For now, we'll need to fetch opportunities and match them
          // In production, you might want to store opportunity data in the match run
          const opportunitiesResponse = await fetch('/api/opportunities?limit=1000');
          const opportunitiesData = await opportunitiesResponse.json();
          const allOpportunities = opportunitiesData.opportunities || [];
          
          // Map topMatches to full opportunities
          const matchedOpportunities = currentMatches.topMatches
            .map(match => {
              const opp = allOpportunities.find(o => o.id === match.opportunityId);
              if (!opp) return null;
              
              return {
                ...opp,
                winRate: match.scores.rankingScore,
                matchScore: match.scores.rankingScore,
                eligibilityNotes: match.notes.eligibilityNotes,
                matchReasoning: {
                  summary: match.notes.matchSummary,
                  strengths: [],
                  concerns: [],
                  specificReasons: match.eligibilityGate.reasons,
                  eligibilityHighlights: match.notes.eligibilityNotes,
                  confidenceScore: match.confidenceScore,
                },
              };
            })
            .filter(Boolean) as Opportunity[];
          
          setOpportunities(matchedOpportunities);
          console.log(`[useProductionOpportunities] Loaded ${matchedOpportunities.length} matched opportunities`);
        } else {
          console.log('[useProductionOpportunities] No current matches found');
          setOpportunities([]);
        }
      } catch (err: any) {
        console.error('[useProductionOpportunities] Error loading current matches:', err);
        setOpportunities([]);
      }
    }

    loadOpportunities();
  }, [profile?.uid]);

  const rerunMatching = async () => {
    if (!profile?.uid) return;

    setMatching(true);
    setError(null);

    try {
      const response = await fetch('/api/run-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.uid,
          trigger: 'RERUN_BUTTON',
          forceRun: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run matching');
      }

      const data = await response.json();
      console.log(`[rerunMatching] Matching complete: ${data.matchesCount} matches`);

      // Reload opportunities
      window.location.reload(); // Simple reload for now
    } catch (err: any) {
      console.error('[rerunMatching] Error:', err);
      setError(`Failed to rerun matching: ${err.message}`);
    } finally {
      setMatching(false);
    }
  };

  return {
    opportunities,
    loading: loading || matching,
    error,
    rerunMatching,
  };
}

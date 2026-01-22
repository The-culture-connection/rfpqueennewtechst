import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { matchOpportunitiesProduction, ALGORITHM_VERSION } from '@/lib/productionMatchAlgorithm';
import { saveMatchRun, getUserProfileWithVersions, migrateUserIfNeeded, getUserOpportunitySignals } from '@/lib/matchDataAccess';
import { logAIAuditEvent, createAuditRequestId } from '@/lib/aiAudit';
import { Opportunity, UserProfile, MatchTrigger } from '@/types';
import { refineMatchesWithAI } from '@/lib/aiMatchRefinement';
import { fetchAllOpportunities } from '@/lib/apiIntegrations';
import { loadSAMGovFromCSV } from '@/lib/samGovCsvLoader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for matching

export async function POST(request: Request) {
  const requestId = createAuditRequestId();
  const startTime = Date.now();
  
  // Parse request body once and store it
  let requestBody: any;
  try {
    requestBody = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
  
  try {
    const { userId, trigger = 'RERUN_BUTTON', forceRun = false } = requestBody;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    console.log(`[run-matching] Starting match run for user ${userId}, trigger: ${trigger}`);
    
    // Migrate user if needed
    await migrateUserIfNeeded(userId);
    
    // Get user profile with versions
    const { profile: rawProfile, profileVersion, docsVersion } = await getUserProfileWithVersions(userId);
    
    if (!rawProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Convert profile and add computed fields
    const profile: UserProfile = {
      ...rawProfile,
      // Calculate timelinePreferenceDays
      timelinePreferenceDays: rawProfile.timelinePreferenceDays || 
        (rawProfile.timeline === 'immediate' ? 30 :
         rawProfile.timeline === '3-months' ? 90 :
         rawProfile.timeline === '6-months' ? 180 :
         rawProfile.timeline === '12-months' ? 365 : 90),
      // Ensure profileVersion and docsVersion are set
      profileVersion: profileVersion,
      docsVersion: docsVersion,
    };
    
    // Load all opportunities directly (server-side)
    const fundingTypes = profile.fundingType && profile.fundingType.length > 0
      ? profile.fundingType
      : ['grants', 'rfps', 'contracts'];
    
    console.log(`[run-matching] Fetching opportunities for funding types: ${fundingTypes.join(', ')}`);
    
    // Fetch from APIs
    const { opportunities: apiOpportunities } = await fetchAllOpportunities({
      keyword: '',
      limit: 1000,
      fundingTypes: fundingTypes,
    });
    
    // Load SAM.gov opportunities if needed
    let samGovOpportunities: Opportunity[] = [];
    if (fundingTypes.includes('rfps') || fundingTypes.includes('contracts')) {
      samGovOpportunities = await loadSAMGovFromCSV({
        limit: 1000,
        keyword: '',
      });
    }
    
    // Combine and deduplicate
    const allOpportunitiesMap = new Map<string, Opportunity>();
    [...apiOpportunities, ...samGovOpportunities].forEach(opp => {
      const key = `${opp.url}-${opp.title}`.toLowerCase();
      if (!allOpportunitiesMap.has(key)) {
        allOpportunitiesMap.set(key, opp);
      }
    });
    
    const allOpportunities = Array.from(allOpportunitiesMap.values());
    
    console.log(`[run-matching] Loaded ${allOpportunities.length} opportunities`);
    
    // Get excluded opportunity IDs (passed/saved)
    const userSignals = await getUserOpportunitySignals(userId);
    const excludeIds = Array.from(userSignals.values())
      .filter(signal => signal.status === 'passed' || signal.status === 'saved')
      .map(signal => signal.opportunityId);
    
    console.log(`[run-matching] Excluding ${excludeIds.length} passed/saved opportunities`);
    
    // Run production matching algorithm
    const topMatches = await matchOpportunitiesProduction(
      allOpportunities,
      profile,
      excludeIds
    );
    
    console.log(`[run-matching] Production matching complete: ${topMatches.length} matches`);
    
    // Optionally refine top matches with AI (if enabled and OpenAI key available)
    let finalMatches = topMatches;
    if (process.env.OPENAI_API_KEY && topMatches.length > 0) {
      try {
        console.log(`[run-matching] Applying AI refinement to top ${Math.min(20, topMatches.length)} matches...`);
        
        // Convert TopMatch back to Opportunity format for AI refinement
        const topOpportunities = topMatches.slice(0, 20).map(match => {
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
        }).filter(Boolean) as Opportunity[];
        
        const aiRefined = await refineMatchesWithAI(topOpportunities, profile, userId, 20);
        
        // Merge AI refinements back into topMatches
        const aiRefinedMap = new Map(aiRefined.map(opp => [opp.id, opp]));
        finalMatches = topMatches.map(match => {
          const aiRefined = aiRefinedMap.get(match.opportunityId);
          if (aiRefined && aiRefined.matchReasoning) {
            return {
              ...match,
              notes: {
                eligibilityNotes: aiRefined.eligibilityNotes || match.notes.eligibilityNotes,
                matchSummary: aiRefined.matchReasoning.summary || match.notes.matchSummary,
              },
              confidenceScore: aiRefined.matchReasoning.confidenceScore || match.confidenceScore,
            };
          }
          return match;
        });
        
        console.log(`[run-matching] AI refinement complete`);
      } catch (aiError: any) {
        console.error('[run-matching] AI refinement failed, using production matches:', aiError.message);
        // Continue with production matches if AI fails
      }
    }
    
    // Save match run
    const runId = requestId;
    await saveMatchRun(
      userId,
      runId,
      trigger as MatchTrigger,
      profileVersion,
      docsVersion,
      finalMatches,
      'complete'
    );
    
    const latency = Date.now() - startTime;
    
    // Log audit event
    await logAIAuditEvent({
      requestId,
      userId,
      functionName: 'runMatching',
      route: '/api/run-matching',
      phase: 'final_response',
      parsed_result: {
        runId,
        matchesCount: finalMatches.length,
        trigger,
        profileVersion,
        docsVersion,
      },
      latency_ms: latency,
      algorithmVersion: ALGORITHM_VERSION,
    });
    
    console.log(`[run-matching] Match run ${runId} completed in ${latency}ms`);
    
    // Convert TopMatch back to Opportunity format for frontend
    const matchedOpportunities = finalMatches.slice(0, 50).map(match => {
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
    }).filter(Boolean) as Opportunity[];
    
    return NextResponse.json({
      success: true,
      runId,
      matchesCount: finalMatches.length,
      opportunities: matchedOpportunities, // Return as opportunities for frontend compatibility
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[run-matching] Error:', error);
    
    // Log error
    await logAIAuditEvent({
      requestId,
      userId: requestBody?.userId || 'unknown',
      functionName: 'runMatching',
      route: '/api/run-matching',
      phase: 'error',
      error: error.message,
      errorMessage: error.toString(),
      latency_ms: latency,
      algorithmVersion: ALGORITHM_VERSION,
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to run matching',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { matchOpportunitiesProduction, ALGORITHM_VERSION, computeRunStats } from '@/lib/productionMatchAlgorithm';
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
    
    console.log(`\n🚀 [RUN-MATCHING] Starting for user ${userId}, trigger: ${trigger}`);
    
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
    
    console.log(`👤 [PROFILE] ${profile.entityType}, funding: ${profile.fundingType?.join(',')}, timeline: ${profile.timeline} (${profile.timelinePreferenceDays} days)`);
    
    // Load all opportunities directly (server-side)
    const fundingTypes = profile.fundingType && profile.fundingType.length > 0
      ? profile.fundingType
      : ['grants', 'rfps', 'contracts'];
    
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
    
    // Get excluded opportunity IDs (passed/saved)
    const userSignals = await getUserOpportunitySignals(userId);
    const excludeIds = Array.from(userSignals.values())
      .filter(signal => signal.status === 'passed' || signal.status === 'saved')
      .map(signal => signal.opportunityId);
    
    console.log(`📊 [INPUT] ${allOpportunities.length} opportunities, excluding ${excludeIds.length} passed/saved`);
    
    // Run production matching algorithm (returns eligible, unknown, ineligible buckets)
    let matchResults;
    try {
      matchResults = await matchOpportunitiesProduction(
        allOpportunities,
        profile,
        excludeIds
      );
      console.log(`✅ [MATCHING] Complete: ${matchResults.eligible.length} eligible, ${matchResults.unknown.length} unknown, ${matchResults.ineligible} ineligible`);
    } catch (matchError: any) {
      console.error('[run-matching] Error in production matching algorithm:', matchError);
      console.error('[run-matching] Error stack:', matchError.stack);
      throw new Error(`Matching algorithm failed: ${matchError.message}`);
    }
    
    // Extract eligible matches (main results)
    let topMatches = matchResults.eligible;
    const unknownMatches = matchResults.unknown;
    const runStats = matchResults.runStats;
    
    // Optionally refine top matches with AI (if enabled and OpenAI key available)
    let finalMatches = topMatches;
    if (process.env.OPENAI_API_KEY && topMatches.length > 0) {
      try {
        console.log(`🤖 [AI-REFINEMENT] Refining top ${Math.min(20, topMatches.length)} eligible matches...`);
        
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
        // CRITICAL: Eligibility status is NON-OVERRIDABLE - AI cannot make ineligible/unknown eligible
        const aiRefinedMap = new Map(aiRefined.map(opp => [opp.id, opp]));
        finalMatches = topMatches.map(match => {
          const aiRefined = aiRefinedMap.get(match.opportunityId);
          
          // ENFORCEMENT: If eligibility status is not "eligible", do not allow AI to boost it
          if (match.eligibility.status !== 'eligible') {
            // Keep original eligibility status, but allow AI to update notes/summary
            return {
              ...match,
              notes: {
                ...match.notes,
                matchSummary: aiRefined?.matchReasoning?.summary || match.notes.matchSummary,
              },
            };
          }
          
          // Only merge AI refinements for eligible matches
          if (aiRefined && aiRefined.matchReasoning) {
            // Use AI-refined scores if available, otherwise keep original
            const aiRankingScore = aiRefined.matchScore || aiRefined.winRate || match.scores.rankingScore;
            
            return {
              ...match,
              scores: {
                ...match.scores,
                // Update ranking score with AI-refined value (this is the most important)
                rankingScore: aiRankingScore,
              },
              notes: {
                // Use AI-refined eligibility notes (array) or convert to array
                eligibilityNotes: Array.isArray(aiRefined.eligibilityNotes) 
                  ? aiRefined.eligibilityNotes 
                  : (aiRefined.eligibilityNotes ? [aiRefined.eligibilityNotes] : match.notes.eligibilityNotes),
                matchSummary: aiRefined.matchReasoning.summary || match.notes.matchSummary,
              },
              confidenceScore: aiRefined.matchReasoning.confidenceScore || match.confidenceScore,
              // CRITICAL: Preserve eligibility status - AI cannot override
              eligibility: match.eligibility,
            };
          }
          return match;
        });
        
        // Re-sort by AI-refined ranking score
        finalMatches.sort((a, b) => b.scores.rankingScore - a.scores.rankingScore);
        
        // FINAL ENFORCEMENT: Filter out any matches that are not eligible
        // This is a safety check in case AI merge somehow corrupted eligibility
        finalMatches = finalMatches.filter(m => m.eligibility.status === 'eligible');
        
        console.log(`✅ [AI-REFINEMENT] Complete`);
      } catch (aiError: any) {
        console.error('[run-matching] AI refinement failed, using production matches:', aiError.message);
        // Continue with production matches if AI fails
      }
    }
    
    // Save match run (includes eligible, unknown, and stats)
    const runId = requestId;
    await saveMatchRun(
      userId,
      runId,
      trigger as MatchTrigger,
      profileVersion,
      docsVersion,
      finalMatches, // Eligible matches only
      'complete',
      undefined,
      unknownMatches, // Unknown eligibility bucket
      runStats // Run statistics for auditability
    );
    
    const latency = Date.now() - startTime;
    
    // Log audit event with run statistics
    await logAIAuditEvent({
      requestId,
      userId,
      functionName: 'runMatching',
      route: '/api/run-matching',
      phase: 'final_response',
      parsed_result: {
        runId,
        matchesCount: finalMatches.length,
        unknownCount: unknownMatches.length,
        ineligibleCount: runStats?.ineligibleCount || 0,
        trigger,
        profileVersion,
        docsVersion,
        runStats, // Include full run statistics
      },
      latency_ms: latency,
      algorithmVersion: ALGORITHM_VERSION,
    });
    
    console.log(`\n✅ [COMPLETE] Run ${runId} completed in ${latency}ms`);
    console.log(`📊 [STATS] Eligible: ${runStats?.eligibleCount || 0}, Unknown: ${runStats?.unknownCount || 0}, Ineligible: ${runStats?.ineligibleCount || 0}`);
    if (runStats?.missingFieldCounts) {
      const missing = runStats.missingFieldCounts;
      if (missing.applicantTypes > 0 || missing.eligibleEntities > 0) {
        console.log(`   ⚠️  Missing fields: ${missing.applicantTypes} applicantTypes, ${missing.eligibleEntities} eligibleEntities`);
      }
    }
    if (runStats?.topBlockers && runStats.topBlockers.length > 0) {
      console.log(`   🔴 Top blockers: ${runStats.topBlockers.slice(0, 3).map(b => `${b.blocker}(${b.count})`).join(', ')}`);
    }
    
    // Log structured results summary
    console.log(`\n📋 [RESULTS SUMMARY]`);
    console.log(`   Eligible matches (Top ${finalMatches.length}):`);
    finalMatches.slice(0, 5).forEach((match, idx) => {
      console.log(`     ${idx + 1}. ${match.opportunityId.substring(0, 30)}... | Score: ${match.scores.rankingScore.toFixed(1)} | Status: ${match.eligibility.status} | Blockers: ${match.eligibility.blockers.length}`);
    });
    if (unknownMatches && unknownMatches.length > 0) {
      console.log(`   Unknown eligibility matches (Top ${Math.min(5, unknownMatches.length)}):`);
      unknownMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`     ${idx + 1}. ${match.opportunityId.substring(0, 30)}... | Score: ${match.scores.rankingScore.toFixed(1)} | Blockers: ${match.eligibility.blockers.join(', ')}`);
      });
    }
    console.log(`\n💡 View full results: GET /api/debug-matches?userId=${userId}\n`);
    
    // Convert TopMatch back to Opportunity format for frontend (eligible only)
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
          specificReasons: match.eligibility.reasons, // Use new eligibility.reasons
          eligibilityHighlights: match.notes.eligibilityNotes,
          confidenceScore: match.confidenceScore,
        },
        // Add eligibility status for UI
        eligibilityStatus: match.eligibility.status,
        eligibilityBlockers: match.eligibility.blockers,
        eligibilityEvidence: match.eligibility.evidence,
      };
    }).filter(Boolean) as Opportunity[];
    
    // Convert unknown matches for frontend (if needed)
    const unknownOpportunities = (unknownMatches || []).slice(0, 50).map(match => {
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
          specificReasons: match.eligibility.reasons,
          eligibilityHighlights: match.notes.eligibilityNotes,
          confidenceScore: match.confidenceScore,
        },
        eligibilityStatus: match.eligibility.status,
        eligibilityBlockers: match.eligibility.blockers,
        eligibilityEvidence: match.eligibility.evidence,
      };
    }).filter(Boolean) as Opportunity[];
    
    return NextResponse.json({
      success: true,
      runId,
      matchesCount: finalMatches.length,
      opportunities: matchedOpportunities, // Eligible only
      unknownOpportunities: unknownOpportunities, // Unknown eligibility bucket
      runStats, // Include run statistics
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[run-matching] Error:', error);
    console.error('[run-matching] Error stack:', error.stack);
    console.error('[run-matching] Error name:', error.name);
    
    // Log error (with try-catch to prevent error logging from failing)
    try {
      await logAIAuditEvent({
        requestId,
        userId: requestBody?.userId || 'unknown',
        functionName: 'runMatching',
        route: '/api/run-matching',
        phase: 'error',
        error: error?.message || 'Unknown error',
        errorMessage: error?.toString() || String(error),
        latency_ms: latency,
        algorithmVersion: ALGORITHM_VERSION,
      });
    } catch (auditError) {
      console.error('[run-matching] Failed to log audit event:', auditError);
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to run matching',
        errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

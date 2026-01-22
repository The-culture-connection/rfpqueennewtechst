import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { getCurrentMatches } from '@/lib/matchDataAccess';

/**
 * Debug endpoint to view algorithm results in structured format
 * GET /api/debug-matches?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get current matches
    const currentMatches = await getCurrentMatches(userId);

    if (!currentMatches) {
      return NextResponse.json({
        message: 'No matches found for this user',
        userId,
        hasMatches: false,
      });
    }

    // Get the latest run details
    const runRef = db
      .collection('userMatches')
      .doc(userId)
      .collection('runs')
      .doc(currentMatches.runId);
    
    const runDoc = await runRef.get();
    const runData = runDoc.exists ? runDoc.data() : null;

    // Structure the response for easy viewing
    const response = {
      userId,
      runId: currentMatches.runId,
      updatedAt: currentMatches.updatedAt,
      counts: currentMatches.counts,
      runStats: currentMatches.runStats || runData?.runStats,
      
      // Eligible matches (Top Matches)
      eligibleMatches: currentMatches.topMatches.map((match: any) => ({
        opportunityId: match.opportunityId,
        rankingScore: match.scores?.rankingScore,
        fitScore: match.scores?.fitScore,
        effortScore: match.scores?.effortScore,
        eligibilityScore: match.eligibility?.eligibilityScore,
        eligibilityStatus: match.eligibility?.status,
        eligibilityBlockers: match.eligibility?.blockers || [],
        eligibilityReasons: match.eligibility?.reasons || [],
        matchSummary: match.notes?.matchSummary,
        confidenceScore: match.confidenceScore,
        debug: {
          matchedKeywords: match.debug?.matchedKeywords || [],
          timeScore: match.debug?.timeScore,
          gatesTriggered: match.debug?.gatesTriggered || [],
        },
      })),
      
      // Unknown eligibility matches
      unknownMatches: (currentMatches.unknownEligibilityMatches || []).map((match: any) => ({
        opportunityId: match.opportunityId,
        rankingScore: match.scores?.rankingScore,
        fitScore: match.scores?.fitScore,
        effortScore: match.scores?.effortScore,
        eligibilityScore: match.eligibility?.eligibilityScore,
        eligibilityStatus: match.eligibility?.status,
        eligibilityBlockers: match.eligibility?.blockers || [],
        eligibilityReasons: match.eligibility?.reasons || [],
        matchSummary: match.notes?.matchSummary,
        confidenceScore: match.confidenceScore,
        debug: {
          matchedKeywords: match.debug?.matchedKeywords || [],
          timeScore: match.debug?.timeScore,
          gatesTriggered: match.debug?.gatesTriggered || [],
        },
      })),
      
      // Run metadata
      runMetadata: runData ? {
        trigger: runData.trigger,
        profileVersionUsed: runData.profileVersionUsed,
        docsVersionUsed: runData.docsVersionUsed,
        algorithmVersion: runData.algorithmVersion,
        createdAt: runData.createdAt,
        status: runData.status,
      } : null,
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[debug-matches] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch debug matches',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

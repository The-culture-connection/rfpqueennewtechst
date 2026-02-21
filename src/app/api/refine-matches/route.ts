import { NextResponse } from 'next/server';
import { refineMatchesWithAI } from '@/lib/aiMatchRefinement';
import { Opportunity, UserProfile } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { opportunities, profile, userId } = await request.json() as {
      opportunities: Opportunity[];
      profile: UserProfile;
      userId: string;
    };

    if (!opportunities || !profile || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunities, profile, userId' },
        { status: 400 }
      );
    }

    console.log(`🤖 [API] Refining ${opportunities.length} opportunities with AI for user ${userId}`);

    // Refine matches using AI (server-side only)
    const refined = await refineMatchesWithAI(
      opportunities,
      profile,
      userId,
      50 // Limit to top 50
    );

    console.log(`✅ [API] AI refinement complete. Returning ${refined.length} refined opportunities`);

    return NextResponse.json({
      success: true,
      opportunities: refined,
      refinedCount: refined.length,
    });
  } catch (error: any) {
    console.error('❌ [API] Error refining matches:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to refine matches',
        // Return original opportunities on error
        opportunities: (await request.json()).opportunities || []
      },
      { status: 500 }
    );
  }
}

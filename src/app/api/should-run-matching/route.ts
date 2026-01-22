import { NextResponse } from 'next/server';
import { shouldRunMatching } from '@/lib/matchDataAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    const result = await shouldRunMatching(userId);
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[should-run-matching] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check matching status',
        shouldRun: true, // Safe fallback
        reason: 'FIRST_DASHBOARD',
      },
      { status: 500 }
    );
  }
}

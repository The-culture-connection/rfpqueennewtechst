import { NextResponse } from 'next/server';
import { saveUserOpportunitySignal } from '@/lib/matchDataAccess';
import { logAIAuditEvent, createAuditRequestId } from '@/lib/aiAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = createAuditRequestId();
  const startTime = Date.now();
  
  try {
    const { userId, opportunityId, status, runIdContext, userNotes } = await request.json();
    
    if (!userId || !opportunityId || !status) {
      return NextResponse.json(
        { error: 'userId, opportunityId, and status are required' },
        { status: 400 }
      );
    }
    
    if (!['passed', 'saved', 'applied'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: passed, saved, applied' },
        { status: 400 }
      );
    }
    
    console.log(`[user-signal] Saving ${status} signal for opportunity ${opportunityId}`);
    
    await saveUserOpportunitySignal(
      userId,
      opportunityId,
      status,
      runIdContext,
      userNotes
    );
    
    const latency = Date.now() - startTime;
    
    // Log audit event
    await logAIAuditEvent({
      requestId,
      userId,
      functionName: 'saveUserSignal',
      route: '/api/user-signal',
      phase: 'final_response',
      parsed_result: {
        opportunityId,
        status,
        runIdContext,
      },
      latency_ms: latency,
    });
    
    return NextResponse.json({
      success: true,
      message: `Opportunity ${status} successfully`,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[user-signal] Error:', error);
    
    await logAIAuditEvent({
      requestId,
      userId: (await request.json()).userId,
      functionName: 'saveUserSignal',
      route: '/api/user-signal',
      phase: 'error',
      error: error.message,
      errorMessage: error.toString(),
      latency_ms: latency,
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save user signal',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { saveUserOpportunitySignal } from '@/lib/matchDataAccess';
import { logAIAuditEvent, createAuditRequestId } from '@/lib/aiAudit';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const { userId, opportunityId, status, runIdContext, userNotes, opportunity } = requestBody;
    
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
    
    // Save to new system (userOpportunitySignals)
    await saveUserOpportunitySignal(
      userId,
      opportunityId,
      status,
      runIdContext,
      userNotes
    );
    
    // ALSO save to legacy tracker paths for webhook triggers
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    
    if (status === 'saved' && opportunity) {
      // Save to profiles/{userId}/tracker/saved
      const savedRef = db.collection('profiles').doc(userId).collection('tracker').doc('saved');
      const savedDoc = await savedRef.get();
      
      const savedOpportunity = {
        ...opportunity,
        savedAt: now,
        status: 'saved'
      };
      
      if (savedDoc.exists) {
        const existing = savedDoc.data()?.opportunities || [];
        // Check if already exists
        if (!existing.some((opp: any) => opp.id === opportunityId)) {
          await savedRef.update({
            opportunities: [...existing, savedOpportunity]
          });
          console.log(`[user-signal] Saved to legacy tracker/saved for webhook`);
        }
      } else {
        await savedRef.set({
          opportunities: [savedOpportunity]
        });
        console.log(`[user-signal] Created legacy tracker/saved for webhook`);
      }
    } else if (status === 'applied' && opportunity) {
      // Save to profiles/{userId}/tracker/applied
      const appliedRef = db.collection('profiles').doc(userId).collection('tracker').doc('applied');
      const appliedDoc = await appliedRef.get();
      
      const appliedOpportunity = {
        ...opportunity,
        appliedAt: now,
        status: 'applied'
      };
      
      if (appliedDoc.exists) {
        const existing = appliedDoc.data()?.opportunities || [];
        // Check if already exists
        if (!existing.some((opp: any) => opp.id === opportunityId)) {
          await appliedRef.update({
            opportunities: [...existing, appliedOpportunity]
          });
          console.log(`[user-signal] Saved to legacy tracker/applied for webhook`);
        }
      } else {
        await appliedRef.set({
          opportunities: [appliedOpportunity]
        });
        console.log(`[user-signal] Created legacy tracker/applied for webhook`);
      }
    } else if (status === 'passed' && opportunity) {
      // Save to profiles/{userId}/dashboard/passed (as document keys)
      const passedRef = db.collection('profiles').doc(userId).collection('dashboard').doc('passed');
      const passedDoc = await passedRef.get();
      
      const passedData = {
        [opportunityId]: {
          id: opportunityId,
          title: opportunity.title || '',
          agency: opportunity.agency || '',
          source: opportunity.source || '',
          passedAt: now,
          winRate: opportunity.winRate || 0
        }
      };
      
      if (passedDoc.exists) {
        const existing = passedDoc.data() || {};
        // Only add if not already passed
        if (!existing[opportunityId]) {
          await passedRef.update(passedData);
          console.log(`[user-signal] Saved to legacy dashboard/passed for webhook`);
        }
      } else {
        await passedRef.set(passedData);
        console.log(`[user-signal] Created legacy dashboard/passed for webhook`);
      }
    }
    
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
      userId: requestBody?.userId || 'unknown',
      functionName: 'saveUserSignal',
      route: '/api/user-signal',
      phase: 'error',
      error: error?.message || 'Unknown error',
      errorMessage: error?.toString() || String(error),
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

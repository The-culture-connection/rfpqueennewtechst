/**
 * API endpoint to track when an opportunity is viewed
 * Emits webhook event: opportunity.viewed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
function getFirestoreInstance() {
  if (!getApps().length) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
      );

      if (serviceAccount.project_id) {
        initializeApp({
          credential: cert(serviceAccount),
        });
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      return null;
    }
  }
  
  try {
    return getFirestore();
  } catch (error) {
    console.error('Error getting Firestore instance:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, opportunityId, opportunity } = body;

    if (!userId || !opportunityId) {
      return NextResponse.json(
        { error: 'Missing userId or opportunityId' },
        { status: 400 }
      );
    }

    // Store viewed opportunity in Firestore for webhook trigger
    // We'll use a simple collection to track views
    // Only create if db is initialized
    const db = getFirestoreInstance();
    if (db) {
      const viewedRef = db
        .collection('profiles')
        .doc(userId)
        .collection('opportunityViews')
        .doc(opportunityId);

      const viewedData = {
        opportunityId,
        opportunity: opportunity || {},
        viewedAt: new Date().toISOString(),
        userId,
      };

      await viewedRef.set(viewedData, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Opportunity view tracked',
    });
  } catch (error: any) {
    console.error('Error tracking opportunity view:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({
      success: true,
      message: 'Opportunity view tracked (with errors)',
    });
  }
}

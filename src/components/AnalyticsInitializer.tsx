'use client';

import { useEffect } from 'react';
import { getAnalyticsInstance } from '@/lib/firebase';

/**
 * Client-side component to initialize Firebase Analytics
 * This must run in the browser, not during SSR
 */
export function AnalyticsInitializer() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Check if measurement ID is available
    const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    
    console.log('[Analytics] 🔍 Checking initialization...');
    console.log('[Analytics] Measurement ID available:', !!measurementId);
    console.log('[Analytics] Measurement ID value:', measurementId ? `${measurementId.substring(0, 10)}...` : 'MISSING');

    if (!measurementId) {
      console.error('[Analytics] ❌ NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is not set!');
      console.error('[Analytics] ❌ Analytics will not work. Please add it to Railway environment variables.');
      return;
    }

    // Initialize analytics
    try {
      const analytics = getAnalyticsInstance();
      if (analytics) {
        console.log('[Analytics] ✅ Successfully initialized!');
      } else {
        console.warn('[Analytics] ⚠️ Analytics instance is null after initialization');
      }
    } catch (error) {
      console.error('[Analytics] ❌ Failed to initialize analytics:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}


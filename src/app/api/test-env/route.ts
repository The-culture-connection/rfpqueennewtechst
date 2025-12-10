import { NextResponse } from 'next/server';

// Test endpoint to verify environment variables are loaded
// This shows if variables are SET but NOT their actual values (for security)
export async function GET() {
  return NextResponse.json({
    SIMPLER_GRANTS_API_KEY: process.env.SIMPLER_GRANTS_API_KEY ? '✅ SET' : '❌ MISSING',
    SAM_GOV_API_KEY: process.env.SAM_GOV_API_KEY ? '✅ SET' : '❌ MISSING',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '✅ SET' : '❌ MISSING',
    GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ SET' : '❌ MISSING',
    note: 'This endpoint shows if variables are set, but not their actual values for security.',
  });
}



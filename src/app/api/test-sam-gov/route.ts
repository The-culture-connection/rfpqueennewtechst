import { NextResponse } from 'next/server';
import { fetchSAMGovOpportunities } from '@/lib/apiIntegrations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    console.log('[TEST] Testing SAM.gov API...');
    console.log('[TEST] API Key:', process.env.SAM_GOV_API_KEY ? 'SET' : 'MISSING');
    console.log('[TEST] Params:', { q, limit });
    
    const opportunities = await fetchSAMGovOpportunities({
      q,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
      apiKeyStatus: process.env.SAM_GOV_API_KEY ? 'SET' : 'MISSING',
      message: 'SAM.gov API test successful',
    });
  } catch (error: any) {
    console.error('[TEST] SAM.gov API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      apiKeyStatus: process.env.SAM_GOV_API_KEY ? 'SET' : 'MISSING',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}



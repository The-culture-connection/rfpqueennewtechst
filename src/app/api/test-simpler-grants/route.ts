import { NextResponse } from 'next/server';
import { fetchSimplerGrantsOpportunities } from '@/lib/apiIntegrations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const pageSize = parseInt(searchParams.get('page_size') || '10');

  try {
    console.log('[TEST] Testing Simpler.Grants.gov API...');
    console.log('[TEST] API Key:', process.env.SIMPLER_GRANTS_API_KEY ? 'SET' : 'MISSING');
    console.log('[TEST] Params:', { query, pageSize });
    
    const opportunities = await fetchSimplerGrantsOpportunities({
      query,
      page_size: pageSize,
    });

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
      apiKeyStatus: process.env.SIMPLER_GRANTS_API_KEY ? 'SET' : 'MISSING',
      message: 'Simpler.Grants.gov API test successful',
    });
  } catch (error: any) {
    console.error('[TEST] Simpler.Grants.gov API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      apiKeyStatus: process.env.SIMPLER_GRANTS_API_KEY ? 'SET' : 'MISSING',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}



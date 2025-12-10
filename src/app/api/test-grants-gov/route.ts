import { NextResponse } from 'next/server';
import { fetchGrantsGovOpportunities } from '@/lib/apiIntegrations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const rows = parseInt(searchParams.get('rows') || '10');

  try {
    console.log('[TEST] Testing Grants.gov API...');
    console.log('[TEST] Params:', { keyword, rows });
    
    const opportunities = await fetchGrantsGovOpportunities({
      keyword,
      rows,
    });

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
      message: 'Grants.gov API test successful',
    });
  } catch (error: any) {
    console.error('[TEST] Grants.gov API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}



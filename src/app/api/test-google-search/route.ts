import { NextResponse } from 'next/server';
import { fetchGoogleCustomSearchOpportunities } from '@/lib/apiIntegrations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'grants';
  const searchType = searchParams.get('searchType') as 'grants' | 'rfps' | 'accelerators' | 'investors' | null;
  const num = parseInt(searchParams.get('num') || '10');

  try {
    console.log('[TEST] Testing Google Custom Search API...');
    console.log('[TEST] API Key:', process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING');
    console.log('[TEST] Search Engine ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? 'SET' : 'MISSING');
    console.log('[TEST] Params:', { query, searchType, num });
    
    const opportunities = await fetchGoogleCustomSearchOpportunities({
      query,
      searchType: searchType || 'grants',
      num,
    });

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
      apiKeyStatus: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING',
        GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? 'SET' : 'MISSING',
      },
      message: 'Google Custom Search API test successful',
    });
  } catch (error: any) {
    console.error('[TEST] Google Custom Search API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      apiKeyStatus: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING',
        GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID ? 'SET' : 'MISSING',
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}



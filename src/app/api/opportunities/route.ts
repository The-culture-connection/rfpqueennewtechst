import { NextResponse } from 'next/server';
import { fetchAllOpportunities } from '@/lib/apiIntegrations';
import { loadSAMGovFromCSV } from '@/lib/samGovCsvLoader';

// Force dynamic rendering and set runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Log immediately - this confirms the route handler is being called
  const requestUrl = request.url;
  const requestMethod = request.method;
  const timestamp = new Date().toISOString();
  
  console.log('='.repeat(80));
  console.log(`[API] [${timestamp}] Opportunities route handler invoked (API-based)`);
  console.log(`[API] Request URL: ${requestUrl}`);
  console.log(`[API] Request Method: ${requestMethod}`);
  console.log(`[API] Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`[API] Vercel Environment: ${process.env.VERCEL_ENV || 'not-vercel'}`);
  console.log('='.repeat(80));
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Health check endpoint - returns immediately without processing
    if (searchParams.get('health') === 'true') {
      console.log('[API] Health check requested');
      return NextResponse.json({
        success: true,
        status: 'healthy',
        route: '/api/opportunities',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        vercel: process.env.VERCEL_ENV || 'local',
        message: 'API route is accessible (using external APIs)'
      });
    }
    
    const limit = parseInt(searchParams.get('limit') || '100'); // Default to 100
    const hasDeadline = searchParams.get('hasDeadline') === 'true';
    const fundingTypes = searchParams.get('fundingTypes')?.split(',') || []; // e.g., "grants,rfps"
    const keyword = searchParams.get('keyword') || '';
    console.log('[API] Request params:', { limit, hasDeadline, fundingTypes, keyword });
    
    // Fetch opportunities from all APIs
    console.log('[API] Fetching opportunities from external APIs...');
    const { opportunities: apiOpportunities, sourceCounts } = await fetchAllOpportunities({
      keyword: keyword,
      limit: limit * 2, // Fetch more from APIs to account for SAM.gov CSV additions
      fundingTypes: fundingTypes,
    });
    
    // Load SAM.gov opportunities from Firebase Storage CSV
    let samGovOpportunities: Opportunity[] = [];
    if (fundingTypes.length === 0 || fundingTypes.includes('rfps') || fundingTypes.includes('contracts')) {
      console.log('[API] Loading SAM.gov opportunities from Firebase Storage CSV...');
      samGovOpportunities = await loadSAMGovFromCSV({
        limit: limit,
        keyword: keyword,
      });
      sourceCounts.samGov = samGovOpportunities.length;
      console.log(`[API] Loaded ${samGovOpportunities.length} SAM.gov opportunities from CSV`);
    }
    
    // Combine all opportunities
    let allOpportunities = [...apiOpportunities, ...samGovOpportunities];
    
    // Deduplicate all opportunities together (including SAM.gov CSV)
    const opportunityMap = new Map<string, Opportunity>();
    for (const opp of allOpportunities) {
      const normalizedUrl = (opp.url || '').toLowerCase().trim();
      const normalizedTitle = (opp.title || '').toLowerCase().trim();
      const key = `${normalizedUrl}-${normalizedTitle}`;
      
      if (!normalizedUrl || !normalizedTitle || normalizedUrl === 'n/a' || normalizedUrl === '') {
        continue;
      }
      
      const existing = opportunityMap.get(key);
      if (!existing) {
        opportunityMap.set(key, opp);
      } else {
        // Keep the one with more complete data
        const existingScore = (existing.description?.length || 0) + 
                             (existing.closeDate ? 10 : 0) + 
                             (existing.amount ? 5 : 0) +
                             (existing.contactEmail ? 3 : 0) +
                             (existing.agency ? 2 : 0);
        const newScore = (opp.description?.length || 0) + 
                        (opp.closeDate ? 10 : 0) + 
                        (opp.amount ? 5 : 0) +
                        (opp.contactEmail ? 3 : 0) +
                        (opp.agency ? 2 : 0);
        
        if (newScore > existingScore) {
          opportunityMap.set(key, opp);
        }
      }
    }
    
    allOpportunities = Array.from(opportunityMap.values());
    console.log(`[API] After combining and deduplicating: ${allOpportunities.length} unique opportunities`);
    
    // Filter opportunities based on criteria
    let filteredOpportunities = allOpportunities;
    
    // Filter: only include opportunities with deadlines if requested
    if (hasDeadline) {
      filteredOpportunities = filteredOpportunities.filter(opp => 
        opp.closeDate || opp.deadline
      );
    }
    
    // Filter: only include opportunities with future deadlines
    filteredOpportunities = filteredOpportunities.filter(opp => {
      if (opp.closeDate || opp.deadline) {
        try {
          const deadlineDate = new Date(opp.closeDate || opp.deadline || '');
          const today = new Date();
          return deadlineDate >= today;
        } catch {
          // If date parsing fails, include it anyway
          return true;
        }
      }
      return true;
    });
    
    // Filter: only include opportunities with active URLs
    filteredOpportunities = filteredOpportunities.filter(opp => 
      opp.url && opp.url.trim() !== '' && opp.url !== 'N/A' && opp.url !== 'n/a'
    );
    
    // Limit results
    const limitedOpportunities = filteredOpportunities.slice(0, limit);
    
    // Count sources from final filtered results
    const finalSourceCounts = {
      grantsGov: limitedOpportunities.filter(o => o.source === 'Grants.gov').length,
      simplerGrants: limitedOpportunities.filter(o => o.source === 'Simpler.Grants.gov').length,
      samGov: limitedOpportunities.filter(o => o.source === 'SAM.gov').length,
      googleSearch: limitedOpportunities.filter(o => o.source?.includes('Google Search')).length,
    };
    
    console.log(`[API] Total opportunities fetched: ${allOpportunities.length}`);
    console.log(`[API] After filtering: ${filteredOpportunities.length}`);
    console.log(`[API] After limiting: ${limitedOpportunities.length}`);
    console.log(`[API] Source counts (raw):`, sourceCounts);
    console.log(`[API] Source counts (final):`, finalSourceCounts);
    
    return NextResponse.json({
      success: true,
      count: limitedOpportunities.length,
      opportunities: limitedOpportunities,
      hasMore: filteredOpportunities.length > limit,
      sources: finalSourceCounts,
      sourcesRaw: sourceCounts, // Include raw counts before deduplication
    });
  } catch (error: any) {
    console.error('[ERROR] Fatal error in opportunities route:', error);
    console.error('[ERROR] Error type:', error?.name);
    console.error('[ERROR] Error message:', error?.message);
    console.error('[ERROR] Error code:', error?.code);
    console.error('[ERROR] Error stack:', error?.stack);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to load opportunities from APIs';
    let fix = '';
    let details = error?.message || 'Unknown error';
    
    if (error?.message?.includes('API error')) {
      errorMessage = 'External API Error';
      details = error.message;
      fix = 'Check API credentials and rate limits. Verify API keys are set in environment variables.';
    } else if (error?.message?.includes('timeout') || error?.code === 4) {
      errorMessage = 'Request Timeout';
      details = 'The request took too long to complete.';
      fix = 'Try reducing the limit parameter or check network connectivity.';
    } else if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Network Connection Error';
      details = 'Cannot connect to external APIs. Network issue or DNS problem.';
      fix = 'Check network connectivity and API endpoint availability.';
    } else if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
      errorMessage = 'Code Error';
      details = `JavaScript error: ${error?.message}`;
      fix = 'Check server logs for full stack trace. This indicates a bug in the code.';
    }
    
    // Return a proper error response
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: details,
        fix: fix,
        type: error?.name || 'Error',
        code: error?.code,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
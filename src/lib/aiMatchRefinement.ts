// AI-powered final refinement layer for opportunity matching
// Uses OpenAI to re-rank opportunities and provide detailed eligibility notes
// NOTE: This module is server-side only (requires OpenAI API and Firestore Admin)

import { Opportunity, UserProfile, MatchReasoning } from '@/types';

// Dynamic imports for server-side only modules (to avoid bundling in client)
let OpenAIModule: any = null;
let auditModule: any = null;

// Lazy-load OpenAI client and audit functions (server-side only)
let openaiClient: any = null;
async function getOpenAIClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getOpenAIClient can only be called server-side');
  }
  
  if (!openaiClient) {
    if (!OpenAIModule) {
      OpenAIModule = await import('openai');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    const OpenAI = OpenAIModule.default;
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

async function loadAuditFunctions() {
  if (typeof window !== 'undefined') {
    // Return no-op functions on client-side
    return {
      logAIAuditEvent: async () => {},
      createAuditRequestId: () => 'client-side-id',
    };
  }
  
  if (!auditModule) {
    auditModule = await import('@/lib/aiAudit');
  }
  return {
    logAIAuditEvent: auditModule.logAIAuditEvent,
    createAuditRequestId: auditModule.createAuditRequestId,
  };
}

interface AIRefinedMatch {
  opportunityId: string;
  refinedWinRate: number; // 0-100
  eligibilityNotes: string[]; // Detailed eligibility explanations
  matchReasoning: {
    summary: string;
    strengths: string[];
    concerns: string[];
    specificReasons: string[];
    eligibilityHighlights: string[];
    confidenceScore: number;
  };
  rankingScore: number; // For sorting
}

/**
 * Refine top opportunities using AI to provide better matching and eligibility notes
 * This is the final layer after code-based filtering
 */
export async function refineMatchesWithAI(
  opportunities: Opportunity[],
  profile: UserProfile,
  userId?: string,
  maxOpportunities: number = 50 // Limit to top 50 to control costs
): Promise<Opportunity[]> {
  // Skip on client-side (this should never be called client-side, but safety check)
  if (typeof window !== 'undefined') {
    console.warn('⚠️ [AI Match Refinement] Skipping - client-side execution not supported');
    return opportunities;
  }
  
  // Load audit functions dynamically
  const { createAuditRequestId: createId, logAIAuditEvent: logEvent } = await loadAuditFunctions();
  const requestId = createId();
  const startTime = Date.now();
  
  // Only refine top opportunities to control API costs
  const topOpportunities = opportunities.slice(0, maxOpportunities);
  
  if (topOpportunities.length === 0) {
    return opportunities;
  }
  
  console.log(`🤖 [AI Match Refinement] Refining ${topOpportunities.length} top opportunities with OpenAI...`);
  
  try {
    // Build context about the user profile
    const profileContext = buildProfileContext(profile);
    
    // Build opportunity summaries for AI analysis
    const opportunitySummaries = topOpportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      agency: opp.agency,
      description: opp.description?.substring(0, 1000) || '', // Limit description length
      type: opp.type,
      amount: opp.amount,
      closeDate: opp.closeDate || opp.deadline,
      eligibleEntities: opp.eligibleEntities || [],
      applicantTypes: opp.applicantTypes || [],
      fundingActivityCategories: opp.fundingActivityCategories || [],
      currentWinRate: opp.winRate || 0,
      currentMatchScore: opp.matchScore || 0,
    }));
    
    // Phase 1: Build prompt
    const systemMessage = `You are an expert RFP and grant matching assistant. Your job is to analyze opportunities and provide detailed eligibility assessments and match quality scores.

You will receive:
1. A user profile with their organization details, interests, and capabilities
2. A list of opportunities that have already been pre-filtered and scored

Your tasks:
1. Re-evaluate each opportunity's match quality (0-100 score) based on eligibility and fit
2. Provide detailed eligibility notes explaining why the user is eligible or not
3. Generate specific match reasoning including strengths, concerns, and confidence score
4. Rank opportunities by best match first

Be specific and actionable in your eligibility notes. Focus on concrete reasons why they qualify.`;

    const userPrompt = `User Profile:
${profileContext}

Opportunities to Analyze (${opportunitySummaries.length} total):
${JSON.stringify(opportunitySummaries, null, 2)}

For each opportunity, provide:
1. refinedWinRate: A refined match score (0-100) based on eligibility and fit
2. eligibilityNotes: Array of 3-5 specific, actionable notes explaining eligibility (e.g., "Your ${profile.entityType} entity type qualifies", "Your experience in [specific area] aligns with requirements", "Your certifications match the opportunity's needs")
3. matchReasoning: {
   summary: A 2-3 sentence summary of why this is a good match
   strengths: Array of 3-5 specific strengths (e.g., "Strong alignment with your ${profile.interestsMain?.[0] || 'primary'} interest area", "Your past performance demonstrates relevant experience")
   concerns: Array of 1-3 potential concerns or gaps (e.g., "May require additional certifications", "Timeline might be tight")
   specificReasons: Array of 3-5 specific reasons for the match
   eligibilityHighlights: Array of 3-5 highlights explaining eligibility (should match eligibilityNotes but more concise)
   confidenceScore: 0-100 confidence in this match assessment
}
4. rankingScore: A score for final ranking (higher = better match)

Return JSON object with "matches" array in this format:
{
  "matches": [
    {
      "opportunityId": "opp-id-1",
      "refinedWinRate": 85,
      "eligibilityNotes": ["Note 1", "Note 2", "Note 3"],
      "matchReasoning": {
        "summary": "...",
        "strengths": ["..."],
        "concerns": ["..."],
        "specificReasons": ["..."],
        "eligibilityHighlights": ["..."],
        "confidenceScore": 85
      },
      "rankingScore": 90
    },
    ...
  ]
}

IMPORTANT: 
- Be specific and reference actual details from the user profile
- Eligibility notes should be actionable and clear
- Confidence score should reflect how certain you are about the match
- rankingScore should consider both winRate and confidence`;

    const messages = [
      {
        role: "system" as const,
        content: systemMessage
      },
      {
        role: "user" as const,
        content: userPrompt
      }
    ];
    
    // Log prompt build phase
    const { logAIAuditEvent: logEvent } = await loadAuditFunctions();
    await logEvent({
      requestId,
      userId,
      functionName: 'refineMatchesWithAI',
      route: '/api/match-opportunities',
      phase: 'prompt_build',
      model: 'gpt-4o-mini',
      messages,
      input: JSON.stringify({ profileContext, opportunityCount: opportunitySummaries.length }),
      parameters: {
        temperature: 0.3, // Slightly higher for more nuanced analysis
        response_format: { type: "json_object" },
      },
    });
    
    const openaiClient = await getOpenAIClient();
    const requestStartTime = Date.now();
    
    // Phase 2: Make OpenAI request
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3, // Balanced for nuanced analysis
    });
    
    const requestLatency = Date.now() - requestStartTime;
    const rawResponse = response.choices[0].message.content || '{}';
    
    // Log OpenAI response phase
    await logEvent({
      requestId,
      userId,
      functionName: 'refineMatchesWithAI',
      route: '/api/match-opportunities',
      phase: 'openai_response',
      model: 'gpt-4o-mini',
      raw_response: rawResponse,
      latency_ms: requestLatency,
      token_usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined,
    });
    
    // Phase 3: Parse and process response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON: ${rawResponse.substring(0, 200)}`);
    }
    
    // Handle both array and object with "matches" key
    const refinedMatches: AIRefinedMatch[] = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.matches || parsedResponse.refinedMatches || [];
    
    if (!Array.isArray(refinedMatches) || refinedMatches.length === 0) {
      console.warn('⚠️ [AI Match Refinement] AI returned invalid format, falling back to original');
      return opportunities;
    }
    
    console.log(`✅ [AI Match Refinement] Received ${refinedMatches.length} refined matches from AI`);
    
    // Create a map of refined matches by opportunity ID
    const refinedMap = new Map<string, AIRefinedMatch>();
    refinedMatches.forEach(match => {
      refinedMap.set(match.opportunityId, match);
    });
    
    // Phase 4: Merge AI refinements back into opportunities
    const refinedOpportunities = opportunities.map(opp => {
      const refined = refinedMap.get(opp.id);
      
      if (refined && refined.matchReasoning) {
        // Update with AI-refined data
        return {
          ...opp,
          winRate: refined.refinedWinRate, // Use AI-refined win rate
          matchScore: refined.rankingScore, // Use ranking score for sorting
          matchReasoning: {
            summary: refined.matchReasoning.summary || opp.matchReasoning?.summary || '',
            strengths: refined.matchReasoning.strengths || [],
            concerns: refined.matchReasoning.concerns || [],
            specificReasons: refined.matchReasoning.specificReasons || [],
            eligibilityHighlights: refined.matchReasoning.eligibilityHighlights || refined.eligibilityNotes || [],
            confidenceScore: refined.matchReasoning.confidenceScore || 60,
          } as MatchReasoning,
          // Store eligibility notes in a custom field (can be displayed in UI)
          eligibilityNotes: refined.eligibilityNotes || refined.matchReasoning.eligibilityHighlights || [],
        };
      }
      
      // For opportunities not refined by AI (beyond top N), keep original
      return opp;
    });
    
    // Phase 5: Re-sort by AI ranking score
    refinedOpportunities.sort((a, b) => {
      const scoreA = a.matchScore || a.winRate || 0;
      const scoreB = b.matchScore || b.winRate || 0;
      return scoreB - scoreA;
    });
    
    // Log post-process phase
    await logEvent({
      requestId,
      userId,
      functionName: 'refineMatchesWithAI',
      route: '/api/match-opportunities',
      phase: 'post_process',
      parsed_result: {
        opportunitiesRefined: refinedMatches.length,
        totalOpportunities: opportunities.length,
        top5Refined: refinedOpportunities.slice(0, 5).map(o => ({
          id: o.id,
          title: o.title?.substring(0, 50),
          refinedWinRate: o.winRate,
          rankingScore: o.matchScore,
        })),
      },
    });
    
    // Log final response phase
    const totalLatency = Date.now() - startTime;
    await logEvent({
      requestId,
      userId,
      functionName: 'refineMatchesWithAI',
      route: '/api/match-opportunities',
      phase: 'final_response',
      parsed_result: {
        totalOpportunities: refinedOpportunities.length,
        refinedCount: refinedMatches.length,
      },
      latency_ms: totalLatency,
    });
    
    console.log(`✅ [AI Match Refinement] Completed in ${totalLatency}ms. Refined ${refinedMatches.length} opportunities.`);
    
    return refinedOpportunities;
  } catch (error: any) {
    const totalLatency = Date.now() - startTime;
    console.error('❌ [AI Match Refinement] Error:', error.message);
    
    // Log error phase
    const { logAIAuditEvent: logEvent } = await loadAuditFunctions();
    await logEvent({
      requestId,
      userId,
      functionName: 'refineMatchesWithAI',
      route: '/api/match-opportunities',
      phase: 'error',
      error: error.message,
      errorMessage: error.toString(),
      latency_ms: totalLatency,
    });
    
    // Fall back to original opportunities if AI fails
    console.warn('⚠️ [AI Match Refinement] Falling back to original opportunities');
    return opportunities;
  }
}

/**
 * Build a concise context string about the user profile for AI analysis
 */
function buildProfileContext(profile: UserProfile): string {
  const parts: string[] = [];
  
  parts.push(`Organization: ${profile.entityName || 'Unknown'}`);
  parts.push(`Entity Type: ${profile.entityType}`);
  parts.push(`Funding Types Interested In: ${profile.fundingType?.join(', ') || 'All'}`);
  parts.push(`Primary Interests: ${profile.interestsMain?.join(', ') || 'None specified'}`);
  parts.push(`Timeline Preference: ${profile.timeline}`);
  
  if (profile.keywords && profile.keywords.length > 0) {
    parts.push(`Keywords: ${profile.keywords.slice(0, 10).join(', ')}`);
  }
  
  if (profile.positiveKeywords && profile.positiveKeywords.length > 0) {
    parts.push(`Priority Keywords: ${profile.positiveKeywords.slice(0, 5).join(', ')}`);
  }
  
  if (profile.negativeKeywords && profile.negativeKeywords.length > 0) {
    parts.push(`Excluded Keywords: ${profile.negativeKeywords.slice(0, 5).join(', ')}`);
  }
  
  // Add business profile context if available
  if (profile.businessProfile) {
    const bp = profile.businessProfile;
    if (bp.companyOverview) {
      parts.push(`Company Overview: ${bp.companyOverview.substring(0, 200)}`);
    }
    if (bp.servicesCapabilities && bp.servicesCapabilities.length > 0) {
      parts.push(`Services/Capabilities: ${bp.servicesCapabilities.slice(0, 5).join(', ')}`);
    }
    if (bp.certifications && bp.certifications.length > 0) {
      parts.push(`Certifications: ${bp.certifications.join(', ')}`);
    }
    if (bp.pastPerformance && bp.pastPerformance.length > 0) {
      parts.push(`Past Performance: ${bp.pastPerformance.length} projects documented`);
    }
  }
  
  return parts.join('\n');
}

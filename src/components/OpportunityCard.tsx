'use client';

import { Opportunity, UserProfile } from '@/types';
import { useState } from 'react';
import { getOpportunitySnippet, buildWhyMatchLine, getInDepthSummary } from '@/lib/opportunitySnippets';
import { generateMatchReasoning, generateMatchSummary } from '@/lib/matchReasoning';

interface OpportunityCardProps {
  opportunity: Opportunity;
  userProfile?: UserProfile | null;
  onPass: (id: string) => void;
  onSave: (id: string) => void;
  onApply: (id: string) => void;
}

export default function OpportunityCard({ opportunity, userProfile, onPass, onSave, onApply }: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const winRate = opportunity.winRate || 0;
  const winRateColor = winRate >= 70 ? 'text-[#ad3c94]' : winRate >= 50 ? 'text-yellow-400' : 'text-[#e7e8ef]/60';
  const winRateBg = winRate >= 70 ? 'bg-[#1d1d1e] border-[#ad3c94]/50' : winRate >= 50 ? 'bg-[#1d1d1e] border-yellow-400/50' : 'bg-[#1d1d1e] border-[#e7e8ef]/30';

  // Get snippet using hybrid approach
  const snippet = getOpportunitySnippet(opportunity, userProfile?.keywords);
  const whyMatch = buildWhyMatchLine(userProfile, opportunity);
  const inDepthSummary = getInDepthSummary(
    opportunity,
    opportunity.fitComponents,
    (opportunity as any).positiveKeywordMatches
  );
  const fullDescription = opportunity.description || '';
  const showExpandButton = fullDescription.length > snippet.length + 50;
  
  // Generate match reasoning from fit components
  const matchReasons = generateMatchReasoning(opportunity, opportunity.fitComponents);
  const matchSummary = generateMatchSummary(opportunity.fitComponents);

  // Format deadline
  const formatDeadline = (date: string | null | undefined) => {
    if (!date) return 'No deadline';
    try {
      return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return date;
    }
  };

  // Calculate days until deadline
  const daysUntilDeadline = (date: string | null | undefined) => {
    if (!date) return null;
    try {
      const deadline = new Date(date);
      const today = new Date();
      const days = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return null;
    }
  };

  const days = daysUntilDeadline(opportunity.closeDate || opportunity.deadline);
  const urgencyBadge = days !== null && days >= 0 && days <= 30;

  return (
    <div className="bg-[#1d1d1e] rounded-xl shadow-lg hover:shadow-xl transition-all border border-[#ad3c94]/30 overflow-hidden">
      {/* Header with Win Rate */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-primary border ${winRateBg} ${winRateColor}`}>
                {winRate}% Match
              </span>
              <span className={`px-2 py-1 rounded text-xs font-secondary border ${
                opportunity.type === 'Grant' ? 'bg-[#1d1d1e] text-[#ad3c94] border-[#ad3c94]/50' : 'bg-[#1d1d1e] text-[#ad3c94] border-[#ad3c94]/50'
              }`}>
                {opportunity.type}
              </span>
              {urgencyBadge && (
                <span className="px-2 py-1 rounded text-xs font-secondary bg-[#1d1d1e] text-red-400 border border-red-400/50">
                  {days} day{days !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
            <h3 className="text-xl font-primary text-[#ad3c94] mb-2">
              {opportunity.title}
            </h3>
            <p className="text-sm font-secondary text-[#e7e8ef]/80">
              {opportunity.agency || 'Unknown Agency'}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {opportunity.amount && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-[#e7e8ef] font-medium">{opportunity.amount}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm font-secondary">
            <span className="text-[#e7e8ef]">
              Deadline: <span className="font-medium">{formatDeadline(opportunity.closeDate || opportunity.deadline)}</span>
            </span>
          </div>

          {(opportunity.city || opportunity.state) && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-[#e7e8ef]">
                {[opportunity.city, opportunity.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {opportunity.source && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-[#e7e8ef] capitalize">{opportunity.source}</span>
            </div>
          )}
        </div>

        {/* Why this is a match */}
        {whyMatch && (
          <div className="mb-3 p-3 bg-[#ad3c94]/10 border border-[#ad3c94]/30 rounded-lg">
            <p className="text-sm font-secondary text-[#ad3c94]">
              <span className="font-semibold">Why this is a match: </span>
              {whyMatch}
            </p>
          </div>
        )}

        {/* Detailed Match Reasoning */}
        {matchReasons.length > 0 && (
          <div className="mb-3 p-3 bg-[#1d1d1e] border border-[#ad3c94]/20 rounded-lg">
            <p className="text-xs font-semibold text-[#ad3c94] mb-2">Match Analysis:</p>
            <div className="space-y-1">
              {matchReasons.map((reason, idx) => (
                <p key={idx} className="text-xs font-secondary text-[#e7e8ef]/80">
                  {reason}
                </p>
              ))}
            </div>
            {matchSummary && (
              <p className="text-xs font-secondary text-[#ad3c94]/80 mt-2 pt-2 border-t border-[#ad3c94]/20">
                {matchSummary}
              </p>
            )}
          </div>
        )}

        {/* In-Depth Summary */}
        {inDepthSummary && (
          <div className="mb-4 p-3 bg-[#1d1d1e] border border-[#ad3c94]/20 rounded-lg">
            <p className="text-xs font-semibold text-[#ad3c94] mb-2">Match Analysis Summary</p>
            <p className="text-sm font-secondary text-[#e7e8ef]/90 leading-relaxed">
              {inDepthSummary}
            </p>
          </div>
        )}

        {/* Description Snippet */}
        {snippet && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#ad3c94] mb-2">Opportunity Details</p>
            <p className="text-sm font-secondary text-[#e7e8ef]/80">
              {isExpanded ? fullDescription : snippet}
            </p>
            {showExpandButton && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-[#ad3c94] hover:text-[#ad3c94]/80 font-secondary mt-2 transition-colors flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <span>Show less</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show full description</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-[#ad3c94]/30">
          <button
            onClick={() => onPass(opportunity.id)}
            className="flex-1 px-4 py-2 bg-[#1d1d1e] text-[#e7e8ef] rounded-lg hover:bg-[#1d1d1e]/80 transition-all font-secondary border border-[#ad3c94]/30"
          >
            Pass
          </button>
          <button
            onClick={() => onSave(opportunity.id)}
            className="flex-1 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary"
          >
            Save
          </button>
          <button
            onClick={() => onApply(opportunity.id)}
            disabled={!opportunity.url}
            className="flex-1 px-4 py-2 bg-[#ad3c94] text-white rounded-lg hover:bg-[#ad3c94]/80 transition-all font-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            title={opportunity.url ? "Open opportunity and add to tracker" : "No link available"}
          >
            Apply
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Info about Apply button */}
        {opportunity.url && (
          <div className="mt-3 pt-3 border-t border-[#ad3c94]/30">
            <p className="text-xs font-secondary text-[#e7e8ef]/70 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Apply button opens opportunity in new tab and adds to your tracker
            </p>
          </div>
        )}

        {/* Refinement Note */}
        <div className="mt-3 pt-3 border-t border-[#ad3c94]/30">
          <p className="text-xs font-secondary text-[#ad3c94]/80 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Refine your search by uploading documentations or adding keywords in Edit Profile</span>
          </p>
        </div>
      </div>
    </div>
  );
}

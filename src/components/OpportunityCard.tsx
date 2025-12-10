'use client';

import { Opportunity, UserProfile } from '@/types';
import { useState } from 'react';
import { getOpportunitySnippet, buildWhyMatchLine, getInDepthSummary } from '@/lib/opportunitySnippets';
import { generateMatchReasoning, generateMatchSummary } from '@/lib/matchReasoning';
import { formatAmount } from '@/lib/formatAmount';

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
  const matchScore = opportunity.matchScore || winRate;
  
  // Dynamic color coding based on match score
  const scoreColor = matchScore >= 75 ? 'text-primary' : matchScore >= 60 ? 'text-secondary' : matchScore >= 45 ? 'text-accent' : 'text-foreground/50';
  const scoreBg = matchScore >= 75 ? 'bg-surface border-primary/50' : matchScore >= 60 ? 'bg-surface border-secondary/50' : matchScore >= 45 ? 'bg-surface border-accent/50' : 'bg-surface border-primary/20';
  
  // Generate nuanced match label
  let matchLabel = '';
  if (matchScore >= 75) {
    matchLabel = 'Exceptional Match';
  } else if (matchScore >= 60) {
    matchLabel = 'Strong Match';
  } else if (matchScore >= 45) {
    matchLabel = 'Moderate Match';
  } else {
    matchLabel = 'Limited Match';
  }

  // Use personalized description if available, otherwise fall back to snippet
  const hasPersonalizedContent = opportunity.matchReasoning && opportunity.personalizedDescription;
  const snippet = hasPersonalizedContent 
    ? opportunity.personalizedDescription 
    : getOpportunitySnippet(opportunity, userProfile?.keywords);
  
  const whyMatch = hasPersonalizedContent && opportunity.matchReasoning
    ? opportunity.matchReasoning.summary
    : buildWhyMatchLine(userProfile, opportunity);
    
  const fullDescription = opportunity.description || '';
  
  // Create 50-word summary
  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const wordCount = getWordCount(fullDescription);
  const words = fullDescription.trim().split(/\s+/).filter(word => word.length > 0);
  const summary = words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');
  const showExpandButton = wordCount > 50;
  
  // Use enhanced match reasoning if available
  const matchReasons = opportunity.matchReasoning?.specificReasons || 
    generateMatchReasoning(opportunity, opportunity.fitComponents);
  const matchSummary = opportunity.matchReasoning?.summary || 
    generateMatchSummary(opportunity.fitComponents);
    
  // Get eligibility highlights from enhanced reasoning
  const eligibilityHighlights = opportunity.matchReasoning?.eligibilityHighlights || [];
  const strengths = opportunity.matchReasoning?.strengths || [];
  const concerns = opportunity.matchReasoning?.concerns || [];
  const confidenceScore = opportunity.matchReasoning?.confidenceScore || 60;

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
    <div className="card overflow-hidden">
      {/* Header with Win Rate */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-primary border ${scoreBg} ${scoreColor}`}>
                {matchLabel} ({matchScore})
              </span>
              {confidenceScore >= 70 && (
                <span className="px-2 py-1 rounded-xl text-xs font-secondary bg-primary/20 text-primary border border-primary/50">
                  High Confidence
                </span>
              )}
              <span className="px-2 py-1 rounded-xl text-xs font-secondary border bg-surface text-primary border-primary/50">
                {opportunity.type}
              </span>
              {urgencyBadge && (
                <span className="px-2 py-1 rounded-xl text-xs font-secondary bg-red-500/10 text-red-400 border border-red-400/50">
                  {days} day{days !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
            <h3 className="text-xl font-primary mb-2 gradient-text">
              {opportunity.title}
            </h3>
            <p className="text-sm font-secondary text-foreground/70">
              {opportunity.agency || 'Unknown Agency'}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {opportunity.amount && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-foreground font-medium">{formatAmount(opportunity.amount)}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm font-secondary">
            <span className="text-foreground/80">
              Deadline: <span className="font-medium text-foreground">{formatDeadline(opportunity.closeDate || opportunity.deadline)}</span>
            </span>
          </div>

          {(opportunity.city || opportunity.state) && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-foreground/80">
                {[opportunity.city, opportunity.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {opportunity.source && (
            <div className="flex items-center text-sm font-secondary">
              <span className="text-foreground/80 capitalize">{opportunity.source}</span>
            </div>
          )}
        </div>

        {/* Eligibility Highlights - Most Important */}
        {eligibilityHighlights.length > 0 && (
          <div className="mb-3 p-4 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 border-2 border-primary/50 rounded-xl">
            <p className="text-sm font-bold gradient-text mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why You're Eligible
            </p>
            <div className="space-y-2">
              {eligibilityHighlights.map((highlight, idx) => (
                <p key={idx} className="text-sm font-secondary text-foreground leading-relaxed">
                  • {highlight}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Match Summary */}
        {whyMatch && (
          <div className="mb-3 p-3 bg-surface border border-primary/30 rounded-xl">
            <p className="text-sm font-secondary text-foreground/90 leading-relaxed">
              {whyMatch}
            </p>
          </div>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-xs font-bold text-green-400 mb-2">Your Competitive Advantages</p>
            <div className="space-y-1">
              {strengths.map((strength, idx) => (
                <p key={idx} className="text-xs font-secondary text-green-300">
                  ✓ {strength}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Concerns */}
        {concerns.length > 0 && (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs font-bold text-yellow-400 mb-2">Considerations</p>
            <div className="space-y-1">
              {concerns.map((concern, idx) => (
                <p key={idx} className="text-xs font-secondary text-yellow-300">
                  ⚠ {concern}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Additional Match Details */}
        {matchReasons.length > 0 && (
          <div className="mb-3 p-3 bg-surface border border-primary/20 rounded-xl">
            <p className="text-xs font-bold gradient-text mb-2">Additional Context</p>
            <div className="space-y-1">
              {matchReasons.map((reason, idx) => (
                <p key={idx} className="text-xs font-secondary text-foreground/70">
                  • {reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Description Summary */}
        {fullDescription && (
          <div className="mb-4">
            <p className="text-sm font-semibold gradient-text mb-2">Summary</p>
            <p className="text-sm font-secondary text-foreground/80 leading-relaxed">
              {isExpanded ? fullDescription : summary}
            </p>
            {showExpandButton && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-primary hover:text-primary-light font-secondary mt-2 transition-colors flex items-center gap-1"
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
                    <span>Show more description</span>
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
        <div className="flex gap-2 pt-4 border-t border-primary/30">
          <button
            onClick={() => onPass(opportunity.id)}
            className="flex-1 btn-secondary"
          >
            Pass
          </button>
          <button
            onClick={() => onSave(opportunity.id)}
            className="flex-1 btn-primary"
          >
            Save
          </button>
          <button
            onClick={() => onApply(opportunity.id)}
            disabled={!opportunity.url}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
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
          <div className="mt-3 pt-3 border-t border-primary/30">
            <p className="text-xs font-secondary text-foreground/60 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Apply button opens opportunity in new tab and adds to your tracker
            </p>
          </div>
        )}

        {/* Refinement Note */}
        <div className="mt-3 pt-3 border-t border-primary/30">
          <p className="text-xs font-secondary text-primary/80 flex items-start gap-2">
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

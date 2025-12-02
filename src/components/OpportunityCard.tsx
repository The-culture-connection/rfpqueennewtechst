'use client';

import { Opportunity } from '@/types';
import { useState } from 'react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onPass: (id: string) => void;
  onSave: (id: string) => void;
  onApply: (id: string) => void;
}

export default function OpportunityCard({ opportunity, onPass, onSave, onApply }: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const winRate = opportunity.winRate || 0;
  const winRateColor = winRate >= 70 ? 'text-pink-300' : winRate >= 50 ? 'text-yellow-300' : 'text-gray-400';
  const winRateBg = winRate >= 70 ? 'bg-pink-500/30 border-pink-400/50' : winRate >= 50 ? 'bg-yellow-500/30 border-yellow-400/50' : 'bg-gray-700/30 border-gray-600/50';

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
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-all border border-pink-400/20 overflow-hidden">
      {/* Header with Win Rate */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${winRateBg} ${winRateColor}`}>
                {winRate}% Match ✨
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                opportunity.type === 'Grant' ? 'bg-purple-500/30 text-purple-300 border-purple-400/50' : 'bg-blue-500/30 text-blue-300 border-blue-400/50'
              }`}>
                {opportunity.type}
              </span>
              {urgencyBadge && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/30 text-red-300 border border-red-400/50">
                  🔥 {days} day{days !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent mb-2">
              {opportunity.title}
            </h3>
            <p className="text-sm text-pink-200/80">
              {opportunity.agency || 'Unknown Agency'}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {opportunity.amount && (
            <div className="flex items-center text-sm">
              <span className="text-pink-400 mr-2">💰</span>
              <span className="text-pink-200 font-medium">{opportunity.amount}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <span className="text-purple-400 mr-2">📅</span>
            <span className="text-purple-200">
              Deadline: <span className="font-medium">{formatDeadline(opportunity.closeDate || opportunity.deadline)}</span>
            </span>
          </div>

          {(opportunity.city || opportunity.state) && (
            <div className="flex items-center text-sm">
              <span className="text-fuchsia-400 mr-2">📍</span>
              <span className="text-fuchsia-200">
                {[opportunity.city, opportunity.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {opportunity.source && (
            <div className="flex items-center text-sm">
              <span className="text-pink-400 mr-2">🔗</span>
              <span className="text-pink-200 capitalize">{opportunity.source}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {opportunity.description && (
          <div className="mb-4">
            <p className={`text-sm text-pink-100/80 ${!isExpanded && 'line-clamp-3'}`}>
              {opportunity.description}
            </p>
            {opportunity.description.length > 150 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-pink-400 hover:text-pink-300 font-medium mt-1 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-pink-400/20">
          <button
            onClick={() => onPass(opportunity.id)}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-all font-medium border border-gray-600"
          >
            Pass
          </button>
          <button
            onClick={() => onSave(opportunity.id)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-medium shadow-lg shadow-yellow-500/50"
          >
            Save ✨
          </button>
          <button
            onClick={() => onApply(opportunity.id)}
            disabled={!opportunity.url}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg shadow-pink-500/50"
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
          <div className="mt-3 pt-3 border-t border-pink-400/20">
            <p className="text-xs text-pink-300/70 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Apply button opens opportunity in new tab and adds to your tracker
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

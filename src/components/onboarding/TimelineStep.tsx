'use client';

import { Timeline } from '@/types';

interface TimelineStepProps {
  selected?: Timeline;
  onChange: (timeline: Timeline) => void;
}

const TIMELINES: { value: Timeline; label: string; description: string }[] = [
  {
    value: 'immediate',
    label: 'Immediate (Within 30 days)',
    description: 'Show me opportunities with deadlines in the next month',
  },
  {
    value: '3-months',
    label: '3 Months',
    description: 'Show me opportunities with deadlines in the next 90 days',
  },
  {
    value: '6-months',
    label: '6 Months',
    description: 'Show me opportunities with deadlines in the next 6 months',
  },
  {
    value: '12-months',
    label: '12+ Months',
    description: 'Show me all available opportunities regardless of deadline',
  },
];

export default function TimelineStep({ selected, onChange }: TimelineStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-primary text-[#ad3c94] mb-2">
        When do you need funding?
      </h2>
      <p className="font-secondary text-[#e7e8ef]/80 mb-6">Select your preferred timeline</p>

      <div className="space-y-4">
        {TIMELINES.map((timeline) => (
          <button
            key={timeline.value}
            onClick={() => onChange(timeline.value)}
            className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
              selected === timeline.value
                ? 'border-[#ad3c94] bg-[#ad3c94]/10'
                : 'border-[#ad3c94]/30 hover:border-[#ad3c94]/50 bg-[#1d1d1e]'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-primary text-[#ad3c94]">{timeline.label}</h3>
                  {selected === timeline.value && (
                    <svg className="w-6 h-6 text-[#ad3c94]" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-secondary text-[#e7e8ef]/80 mt-1">{timeline.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


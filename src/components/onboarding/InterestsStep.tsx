'use client';

import { Interest } from '@/types';

interface InterestsStepProps {
  selected: Interest[];
  onChange: (interests: Interest[]) => void;
}

// Interest categories
const INTEREST_CATEGORIES: { value: Interest; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'environment', label: 'Environment' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'technology', label: 'Technology' },
  { value: 'social-services', label: 'Social Services' },
  { value: 'research', label: 'Research' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'economic-development', label: 'Economic Development' },
  { value: 'housing', label: 'Housing' },
];

export default function InterestsStep({ selected, onChange }: InterestsStepProps) {
  const toggleInterest = (interest: Interest) => {
    if (selected.includes(interest)) {
      onChange(selected.filter((i) => i !== interest));
    } else {
      onChange([...selected, interest]);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-primary text-[#ad3c94] mb-2">
        What are your areas of interest?
      </h2>
      <p className="font-secondary text-[#e7e8ef]/80 mb-6">Select all that apply (minimum 1)</p>

      <div className="max-h-96 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3">
          {INTEREST_CATEGORIES.map((interest) => (
            <button
              key={interest.value}
              onClick={() => toggleInterest(interest.value)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selected.includes(interest.value)
                  ? 'border-[#ad3c94] bg-[#ad3c94]/10'
                  : 'border-[#ad3c94]/30 hover:border-[#ad3c94]/50 bg-[#1d1d1e]'
              }`}
            >
              <div className="flex items-center">
                <div className="flex-1">
                  <span className="text-sm font-primary text-[#ad3c94]">{interest.label}</span>
                  {selected.includes(interest.value) && (
                    <svg className="w-5 h-5 text-[#ad3c94] inline ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-md">
        <p className="text-sm font-secondary text-[#e7e8ef]">
          <strong className="text-[#ad3c94]">{selected.length}</strong> {selected.length === 1 ? 'interest' : 'interests'} selected
        </p>
      </div>
    </div>
  );
}


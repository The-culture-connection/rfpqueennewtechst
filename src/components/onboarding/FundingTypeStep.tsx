'use client';

import { FundingType } from '@/types';

interface FundingTypeStepProps {
  selected: FundingType[];
  onChange: (types: FundingType[]) => void;
}

const FUNDING_TYPES: { value: FundingType; label: string; description: string }[] = [
  {
    value: 'grants',
    label: 'Grants',
    description: 'Non-repayable funds from government agencies, foundations, and organizations',
  },
  {
    value: 'rfps',
    label: 'RFPs (Request for Proposals)',
    description: 'Competitive bidding opportunities for projects and services',
  },
  {
    value: 'contracts',
    label: 'Government Contracts',
    description: 'Federal, state, and local government contracting opportunities',
  },
];

export default function FundingTypeStep({ selected, onChange }: FundingTypeStepProps) {
  const toggleType = (type: FundingType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-primary text-[#ad3c94] mb-2">
        What type of funding are you looking for?
      </h2>
      <p className="font-secondary text-[#e7e8ef]/80 mb-6">Select all that apply</p>

      <div className="space-y-4">
        {FUNDING_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => toggleType(type.value)}
            className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
              selected.includes(type.value)
                ? 'border-[#ad3c94] bg-[#ad3c94]/10'
                : 'border-[#ad3c94]/30 hover:border-[#ad3c94]/50 bg-[#1d1d1e]'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-primary text-[#ad3c94]">{type.label}</h3>
                  {selected.includes(type.value) && (
                    <svg className="w-6 h-6 text-[#ad3c94]" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-secondary text-[#e7e8ef]/80 mt-1">{type.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


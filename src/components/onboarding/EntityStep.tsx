'use client';

import { EntityType } from '@/types';

interface EntityStepProps {
  entityName: string;
  entityType?: EntityType;
  onChangeEntityName: (name: string) => void;
  onChangeEntityType: (type: EntityType) => void;
}

const ENTITY_TYPES: { value: EntityType; label: string; description: string }[] = [
  {
    value: 'nonprofit',
    label: 'Nonprofit Organization',
    description: '501(c)(3), NGO, or other tax-exempt organization',
  },
  {
    value: 'for-profit',
    label: 'For-Profit Business',
    description: 'LLC, corporation, or other for-profit entity',
  },
  {
    value: 'government',
    label: 'Government Agency',
    description: 'Federal, state, local, or municipal government',
  },
  {
    value: 'education',
    label: 'Educational Institution',
    description: 'School, university, college, or student group',
  },
  {
    value: 'individual',
    label: 'Individual',
    description: 'Artist, researcher, freelancer, or independent professional',
  },
];

export default function EntityStep({
  entityName,
  entityType,
  onChangeEntityName,
  onChangeEntityType,
}: EntityStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-primary text-[#ad3c94] mb-2">
        Tell us about your organization
      </h2>
      <p className="font-secondary text-[#e7e8ef]/80 mb-6">This helps us tailor opportunities to your needs</p>

      <div className="space-y-6">
        {/* Entity Name */}
        <div>
          <label htmlFor="entityName" className="block text-sm font-secondary text-[#e7e8ef] mb-2">
            Organization Name <span className="text-red-400">*</span>
          </label>
          <input
            id="entityName"
            type="text"
            value={entityName}
            onChange={(e) => onChangeEntityName(e.target.value)}
            placeholder="Enter your organization name"
            className="w-full px-4 py-3 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-lg font-secondary text-[#e7e8ef] placeholder-[#e7e8ef]/50 focus:ring-2 focus:ring-[#ad3c94] focus:border-transparent"
            required
          />
        </div>

        {/* Entity Type */}
        <div>
          <label className="block text-sm font-secondary text-[#e7e8ef] mb-2">
            Organization Type <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {ENTITY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => onChangeEntityType(type.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  entityType === type.value
                    ? 'border-[#ad3c94] bg-[#ad3c94]/10'
                    : 'border-[#ad3c94]/30 hover:border-[#ad3c94]/50 bg-[#1d1d1e]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-primary text-[#ad3c94]">{type.label}</h3>
                    <p className="text-sm font-secondary text-[#e7e8ef]/80 mt-1">{type.description}</p>
                  </div>
                  {entityType === type.value && (
                    <svg className="w-6 h-6 text-[#ad3c94] flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


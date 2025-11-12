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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Tell us about your organization
      </h2>
      <p className="text-gray-600 mb-6">This helps us tailor opportunities to your needs</p>

      <div className="space-y-6">
        {/* Entity Name */}
        <div>
          <label htmlFor="entityName" className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            id="entityName"
            type="text"
            value={entityName}
            onChange={(e) => onChangeEntityName(e.target.value)}
            placeholder="Enter your organization name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>

        {/* Entity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ENTITY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => onChangeEntityType(type.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  entityType === type.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                  {entityType === type.value && (
                    <svg className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
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


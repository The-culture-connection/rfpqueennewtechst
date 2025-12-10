'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@/types';

export default function TestOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, number>>({});
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(100);

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(keyword && { keyword }),
      });
      
      const response = await fetch(`/api/opportunities?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOpportunities(data.opportunities || []);
        setSources(data.sources || {});
      } else {
        setError(data.error || data.message || 'Failed to fetch opportunities');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Test Opportunities Page
          </h1>
          <p className="text-gray-600 mb-6">
            This page displays all opportunities fetched from the external APIs.
          </p>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                Keyword
              </label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter search keyword..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="w-full sm:w-32">
              <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
                Limit
              </label>
              <input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                min="1"
                max="500"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchOpportunities}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Source Statistics */}
          {Object.keys(sources).length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Opportunities by Source</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(sources).map(([source, count]) => (
                  <div key={source} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-600">{source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading opportunities...</p>
          </div>
        )}

        {/* Opportunities List */}
        {!loading && !error && (
          <div>
            <div className="mb-4 text-gray-600">
              Found {opportunities.length} opportunities
            </div>
            <div className="space-y-4">
              {opportunities.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <p className="text-gray-600">No opportunities found. Try adjusting your search criteria.</p>
                </div>
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {opp.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {opp.source}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            {opp.type}
                          </span>
                          {opp.agency && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                              {opp.agency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {opp.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {opp.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                      {opp.openDate && (
                        <div>
                          <span className="font-medium">Open Date: </span>
                          {new Date(opp.openDate).toLocaleDateString()}
                        </div>
                      )}
                      {opp.closeDate && (
                        <div>
                          <span className="font-medium">Close Date: </span>
                          {new Date(opp.closeDate).toLocaleDateString()}
                        </div>
                      )}
                      {opp.amount && (
                        <div>
                          <span className="font-medium">Amount: </span>
                          {opp.amount}
                        </div>
                      )}
                      {opp.rfpNumber && (
                        <div>
                          <span className="font-medium">Number: </span>
                          {opp.rfpNumber}
                        </div>
                      )}
                    </div>

                    {opp.url && (
                      <a
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Opportunity →
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



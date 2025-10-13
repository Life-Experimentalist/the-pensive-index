'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import type { Fandom } from '@/types';

interface FandomSearchProps {
  fandoms: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    metadata: unknown;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Client Component for Fandom Search
 * Search and filter fandoms by name or description
 */
export default function FandomSearch({ fandoms }: FandomSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredFandoms = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    return fandoms
      .filter(
        fandom =>
          fandom.name.toLowerCase().includes(query) ||
          fandom.description?.toLowerCase().includes(query)
      )
      .slice(0, 5); // Show max 5 results
  }, [searchQuery, fandoms]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="mb-12 relative">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search fandoms..."
            className="block w-full pl-12 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchQuery && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowResults(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              {filteredFandoms.length > 0 ? (
                <div className="py-2">
                  {filteredFandoms.map(fandom => (
                    <Link
                      key={fandom.id}
                      href={`/fandom/${fandom.slug}`}
                      onClick={() => {
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {fandom.name}
                          </h3>
                          {fandom.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                              {fandom.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-lg">No fandoms found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

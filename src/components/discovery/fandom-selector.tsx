'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export interface Fandom {
  id: string;
  name: string;
  slug: string;
  description: string;
  storyCount: number;
  tagCount: number;
  plotBlockCount: number;
  isActive: boolean;
  lastUpdated: string;
}

interface FandomSelectorProps {
  selectedFandomId?: string;
  onFandomSelect: (fandom: Fandom) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function FandomSelector({
  selectedFandomId,
  onFandomSelect,
  className = '',
  placeholder = 'Select a fandom to explore...',
  disabled = false,
}: FandomSelectorProps) {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedFandom = fandoms.find(f => f.id === selectedFandomId);

  // Fetch fandoms on mount
  useEffect(() => {
    fetchFandoms();
  }, []);

  const fetchFandoms = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/discovery/fandoms');

      if (!response.ok) {
        throw new Error(`Failed to fetch fandoms: ${response.statusText}`);
      }

      const data = await response.json();
      setFandoms(data.fandoms || []);
    } catch (error) {
      console.error('Error fetching fandoms:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load fandoms'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter fandoms based on search term
  const filteredFandoms = fandoms.filter(
    fandom =>
      fandom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fandom.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFandomClick = (fandom: Fandom) => {
    onFandomSelect(fandom);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (event: React.KeyboardEvent, fandom?: Fandom) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (fandom) {
        handleFandomClick(fandom);
      } else {
        setIsOpen(!isOpen);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-300 rounded w-32"></div>
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">Error: {error}</span>
            <button
              onClick={fetchFandoms}
              className="text-red-600 hover:text-red-800 text-sm underline"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main selector button */}
      <button
        type="button"
        className={`
          w-full px-4 py-3 text-left border rounded-lg transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${
            disabled
              ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-white border-gray-300 hover:border-gray-400 cursor-pointer'
          }
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={e => handleKeyDown(e)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select fandom"
      >
        <div className="flex items-center justify-between">
          <span className={selectedFandom ? 'text-gray-900' : 'text-gray-500'}>
            {selectedFandom ? selectedFandom.name : placeholder}
          </span>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
        {selectedFandom && (
          <div className="mt-1 text-xs text-gray-500">
            {selectedFandom.storyCount.toLocaleString()} stories •{' '}
            {selectedFandom.tagCount.toLocaleString()} tags
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search fandoms..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Fandom list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredFandoms.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchTerm
                  ? 'No fandoms match your search'
                  : 'No fandoms available'}
              </div>
            ) : (
              <div role="listbox" aria-label="Available fandoms">
                {filteredFandoms.map(fandom => (
                  <button
                    key={fandom.id}
                    type="button"
                    role="option"
                    aria-selected={fandom.id === selectedFandomId}
                    className={`
                      w-full px-3 py-3 text-left hover:bg-gray-50 focus:bg-gray-50
                      focus:outline-none transition-colors duration-150
                      ${
                        fandom.id === selectedFandomId
                          ? 'bg-blue-50 border-r-2 border-blue-500'
                          : ''
                      }
                    `}
                    onClick={() => handleFandomClick(fandom)}
                    onKeyDown={e => handleKeyDown(e, fandom)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {fandom.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {fandom.description}
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span>
                            {fandom.storyCount.toLocaleString()} stories
                          </span>
                          <span>{fandom.tagCount.toLocaleString()} tags</span>
                          <span>
                            {fandom.plotBlockCount.toLocaleString()} plot blocks
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with stats */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {filteredFandoms.length} of {fandoms.length} fandoms shown
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

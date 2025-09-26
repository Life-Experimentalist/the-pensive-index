'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpenIcon,
  SparklesIcon,
  ClockIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export interface Story {
  id: number;
  title: string;
  author: string;
  summary: string;
  url: string;
  metadata: {
    wordCount: number;
    status: string;
    rating?: string;
    language: string;
    lastUpdated: string;
  };
  match: {
    relevanceScore: number;
    matchedTags: string[];
    matchedPlotBlocks: string[];
  };
}

export interface StoryPrompt {
  text: string;
  novelty: {
    highlights: string[];
    suggestions: string[];
  };
  reason: string;
}

interface StoryResultsProps {
  stories: Story[];
  prompt: StoryPrompt;
  isLoading?: boolean;
  error?: string;
  className?: string;
  onStoryClick?: (story: Story) => void;
  onPromptAction?: (action: 'copy' | 'save' | 'share') => void;
}

type SortOption = 'relevance' | 'updated' | 'wordCount' | 'title';
type FilterOption = 'all' | 'complete' | 'ongoing' | 'high-relevance';

function StoryCard({
  story,
  onStoryClick,
}: {
  story: Story;
  onStoryClick?: (story: Story) => void;
}) {
  const handleClick = () => {
    if (onStoryClick) {
      onStoryClick(story);
    }
  };

  const relevanceStars = Math.round((story.match.relevanceScore / 100) * 5);
  const wordCountK = Math.round(story.metadata.wordCount / 1000);

  return (
    <div
      className="group p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title and author */}
          <div className="mb-2">
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-1">
              {story.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">by {story.author}</p>
          </div>

          {/* Summary */}
          <p className="text-sm text-gray-700 line-clamp-3 mb-3">
            {story.summary}
          </p>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center space-x-1">
              <BookOpenIcon className="w-3 h-3" />
              <span>{wordCountK}k words</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                story.metadata.status === 'complete'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {story.metadata.status}
            </span>
            {story.metadata.rating && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                {story.metadata.rating}
              </span>
            )}
            <span className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>
                {new Date(story.metadata.lastUpdated).toLocaleDateString()}
              </span>
            </span>
          </div>

          {/* Match information */}
          <div className="space-y-1">
            {/* Relevance score */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Relevance:</span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star}>
                    {star <= relevanceStars ? (
                      <StarIconSolid className="w-3 h-3 text-yellow-400" />
                    ) : (
                      <StarIcon className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                ({story.match.relevanceScore})
              </span>
            </div>

            {/* Matched elements */}
            {(story.match.matchedTags.length > 0 ||
              story.match.matchedPlotBlocks.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {story.match.matchedTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
                {story.match.matchedPlotBlocks.map(plot => (
                  <span
                    key={plot}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800"
                  >
                    {plot}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* External link icon */}
        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-2" />
      </div>
    </div>
  );
}

function PromptCard({
  prompt,
  onPromptAction,
}: {
  prompt: StoryPrompt;
  onPromptAction?: (action: 'copy' | 'save' | 'share') => void;
}) {
  const handleAction = (action: 'copy' | 'save' | 'share') => {
    if (onPromptAction) {
      onPromptAction(action);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <SparklesIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-blue-900 mb-2">Create New Story</h4>

          <div className="space-y-3">
            {/* Main prompt */}
            <div className="p-3 bg-white rounded border border-blue-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {prompt.text}
              </p>
            </div>

            {/* Novelty highlights */}
            {prompt.novelty.highlights.length > 0 && (
              <div>
                <p className="text-xs font-medium text-blue-800 mb-2">
                  Novel Elements:
                </p>
                <div className="flex flex-wrap gap-1">
                  {prompt.novelty.highlights.map((highlight, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-yellow-100 text-yellow-800 border border-yellow-200"
                    >
                      ✨ {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {prompt.novelty.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-blue-800 mb-2">
                  Consider Adding:
                </p>
                <div className="space-y-1">
                  {prompt.novelty.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs text-blue-700"
                    >
                      <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded border">
              <span className="font-medium">Why create this?</span>{' '}
              {prompt.reason}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={() => handleAction('copy')}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Copy Prompt
            </button>
            <button
              onClick={() => handleAction('save')}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save
            </button>
            <button
              onClick={() => handleAction('share')}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryResults({
  stories,
  prompt,
  isLoading = false,
  error = '',
  className = '',
  onStoryClick,
  onPromptAction,
}: StoryResultsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedStories = useMemo(() => {
    let filtered = [...stories];

    // Apply filters
    switch (filterBy) {
      case 'complete':
        filtered = filtered.filter(
          story => story.metadata.status === 'complete'
        );
        break;
      case 'ongoing':
        filtered = filtered.filter(
          story => story.metadata.status !== 'complete'
        );
        break;
      case 'high-relevance':
        filtered = filtered.filter(story => story.match.relevanceScore >= 70);
        break;
      case 'all':
      default:
        // No filtering
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'relevance':
        filtered.sort(
          (a, b) => b.match.relevanceScore - a.match.relevanceScore
        );
        break;
      case 'updated':
        filtered.sort(
          (a, b) =>
            new Date(b.metadata.lastUpdated).getTime() -
            new Date(a.metadata.lastUpdated).getTime()
        );
        break;
      case 'wordCount':
        filtered.sort((a, b) => b.metadata.wordCount - a.metadata.wordCount);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return filtered;
  }, [stories, sortBy, filterBy]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-6 border border-red-200 rounded-lg bg-red-50 ${className}`}
      >
        <div className="text-center">
          <p className="text-red-800 font-medium">Error loading results</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with sorting and filtering */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Discovery Results
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {stories.length} stories found • Library-first approach
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md border
              transition-colors duration-200
              ${
                showFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Relevance Score</option>
                <option value="updated">Last Updated</option>
                <option value="wordCount">Word Count</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by
              </label>
              <select
                value={filterBy}
                onChange={e => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Stories</option>
                <option value="complete">Complete Only</option>
                <option value="ongoing">Ongoing Only</option>
                <option value="high-relevance">High Relevance (70+)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Existing stories */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <BookOpenIcon className="w-5 h-5" />
              <span>Existing Stories</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAndSortedStories.length} stories match your pathway
            </p>
          </div>

          {filteredAndSortedStories.length === 0 ? (
            <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
              <BookOpenIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">
                No matching stories found
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your pathway or check out the story prompt instead
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedStories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onStoryClick={onStoryClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Story prompt */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5" />
              <span>Create New</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AI-generated prompt for your pathway
            </p>
          </div>

          <PromptCard prompt={prompt} onPromptAction={onPromptAction} />
        </div>
      </div>
    </div>
  );
}

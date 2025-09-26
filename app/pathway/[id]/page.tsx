import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  Download,
  Clock,
  Star,
  Users,
  BookOpen,
  ExternalLink,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ResponsiveWrapper } from '@/components/ui/responsive-wrapper';

// Types for pathway results
interface PathwayState {
  id: string;
  fandomId: string;
  fandomName: string;
  selectedTags: string[];
  selectedPlotBlocks: string[];
  createdAt: string;
  updatedAt: string;
}

interface StoryResult {
  id: string;
  title: string;
  author: string;
  summary: string;
  tags: string[];
  plotBlocks: string[];
  relevanceScore: number;
  readingTime: number;
  rating: number;
  reviewCount: number;
  url: string;
  publishedAt: string;
  completionStatus: 'complete' | 'ongoing' | 'abandoned';
}

interface PromptSuggestion {
  id: string;
  title: string;
  prompt: string;
  noveltyScore: number;
  missingElements: string[];
  inspirationSources: string[];
  estimatedLength: string;
  suggestedTags: string[];
}

interface PathwayResultsData {
  pathway: PathwayState;
  matchingStories: StoryResult[];
  promptSuggestions: PromptSuggestion[];
  searchStats: {
    totalSearched: number;
    exactMatches: number;
    partialMatches: number;
    searchTime: number;
  };
}

// Mock data fetching function (will be replaced with actual service calls)
function fetchPathwayResults(pathwayId: string): PathwayResultsData | null {
  try {
    // TODO: Replace with actual StorySearchService and PromptGenerationService calls
    // const storySearchService = new StorySearchService();
    // const promptService = new PromptGenerationService();

    // Mock data for development
    const mockData: PathwayResultsData = {
      pathway: {
        id: pathwayId,
        fandomId: 'harry-potter',
        fandomName: 'Harry Potter',
        selectedTags: ['time-travel', 'harry/hermione', 'powerful-harry'],
        selectedPlotBlocks: ['Goblin Inheritance', 'Time Turner Mishap'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      matchingStories: [
        {
          id: '1',
          title: 'The Power of Time and Heritage',
          author: 'TimeWriter',
          summary:
            'Harry discovers his inheritance and uses a time turner to change everything...',
          tags: [
            'time-travel',
            'harry/hermione',
            'powerful-harry',
            'inheritance',
          ],
          plotBlocks: ['Goblin Inheritance', 'Time Turner Mishap'],
          relevanceScore: 95,
          readingTime: 45,
          rating: 4.7,
          reviewCount: 234,
          url: 'https://example.com/story1',
          publishedAt: '2023-06-15T00:00:00Z',
          completionStatus: 'complete',
        },
        {
          id: '2',
          title: 'Heritage and Hearts',
          author: 'RomanceAuthor',
          summary:
            'When Harry claims his inheritance, Hermione is there to help him navigate...',
          tags: ['harry/hermione', 'powerful-harry', 'gringotts'],
          plotBlocks: ['Goblin Inheritance'],
          relevanceScore: 78,
          readingTime: 32,
          rating: 4.3,
          reviewCount: 156,
          url: 'https://example.com/story2',
          publishedAt: '2023-08-22T00:00:00Z',
          completionStatus: 'ongoing',
        },
      ],
      promptSuggestions: [
        {
          id: '1',
          title: 'The Time-Traveling Lord',
          prompt:
            "What if Harry's inheritance included temporal magic that let him travel through time at will? Combine this with his growing relationship with Hermione as they work together to change the past and secure their future.",
          noveltyScore: 87,
          missingElements: ['temporal-magic', 'lordship-powers'],
          inspirationSources: ['time-travel', 'powerful-harry'],
          estimatedLength: '50,000-100,000 words',
          suggestedTags: [
            'time-travel',
            'harry/hermione',
            'powerful-harry',
            'temporal-magic',
            'lordship',
          ],
        },
      ],
      searchStats: {
        totalSearched: 15420,
        exactMatches: 2,
        partialMatches: 47,
        searchTime: 342,
      },
    };

    return mockData;
  } catch (error) {
    console.error('Failed to fetch pathway results:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const pathwayData = fetchPathwayResults(resolvedParams.id);

  if (!pathwayData) {
    return {
      title: 'Pathway Not Found - The Pensieve Index',
      description: 'The requested pathway could not be found.',
    };
  }

  const { pathway, matchingStories, promptSuggestions } = pathwayData;
  const title = `${pathway.fandomName} Story Discovery - ${pathway.selectedTags
    .slice(0, 3)
    .join(', ')}`;
  const description = `Found ${matchingStories.length} matching stories and ${
    promptSuggestions.length
  } new story prompts for ${
    pathway.fandomName
  } with ${pathway.selectedTags.join(', ')}.`;

  return {
    title: `${title} - The Pensieve Index`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://pensieve-index.com/pathway/${resolvedParams.id}`,
      siteName: 'The Pensieve Index',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'pathway:id': resolvedParams.id,
      'pathway:fandom': pathway.fandomName,
      'pathway:elements': `${
        pathway.selectedTags.length + pathway.selectedPlotBlocks.length
      }`,
      'results:stories': matchingStories.length.toString(),
      'results:prompts': promptSuggestions.length.toString(),
    },
  };
}

// Story result card component
function StoryCard({ story }: { story: StoryResult }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ongoing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'abandoned':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {story.title}
          </h3>
          <p className="text-gray-600">by {story.author}</p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
            {story.relevanceScore}% match
          </span>
          <span
            className={`px-2 py-1 rounded-full text-sm font-medium border ${getStatusColor(
              story.completionStatus
            )}`}
          >
            {story.completionStatus}
          </span>
        </div>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed">{story.summary}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {story.tags.slice(0, 6).map((tag, index) => (
          <span
            key={index}
            className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm"
          >
            {tag}
          </span>
        ))}
        {story.tags.length > 6 && (
          <span className="text-gray-500 text-sm">
            +{story.tags.length - 6} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{story.readingTime} min read</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{story.rating}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{story.reviewCount} reviews</span>
          </div>
        </div>
        <span className="text-gray-500">
          {new Date(story.publishedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {story.plotBlocks.map((block, index) => (
            <span
              key={index}
              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
            >
              {block}
            </span>
          ))}
        </div>
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium"
        >
          <BookOpen className="w-4 h-4" />
          <span>Read Story</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// Prompt suggestion card component
function PromptCard({ prompt }: { prompt: PromptSuggestion }) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            {prompt.title}
          </h3>
        </div>
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
          {prompt.noveltyScore}% novel
        </span>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed">{prompt.prompt}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <Lightbulb className="w-4 h-4 mr-1" />
            Missing Elements
          </h4>
          <div className="flex flex-wrap gap-1">
            {prompt.missingElements.map((element, index) => (
              <span
                key={index}
                className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm"
              >
                {element}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Estimated Length</h4>
          <span className="text-gray-600">{prompt.estimatedLength}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {prompt.suggestedTags.map((tag, index) => (
          <span
            key={index}
            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Inspired by: {prompt.inspirationSources.join(', ')}
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
          Use This Prompt
        </button>
      </div>
    </div>
  );
}

// Main page component
export default async function PathwayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const pathwayData = fetchPathwayResults(resolvedParams.id);

  if (!pathwayData) {
    return notFound();
  }

  const { pathway, matchingStories, promptSuggestions, searchStats } =
    pathwayData;

  const shareUrl = `https://pensieve-index.com/pathway/${resolvedParams.id}`;
  const shareText = `Found ${matchingStories.length} ${
    pathway.fandomName
  } stories matching ${pathway.selectedTags.join(', ')} - The Pensieve Index`;

  return (
    <ErrorBoundary>
      <ResponsiveWrapper>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/fandom/${pathway.fandomId}`}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to {pathway.fandomName}</span>
                  </Link>
                  <span className="text-gray-300">|</span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Discovery Results
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Pathway Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your Discovery Pathway
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Fandom</h3>
                  <span className="text-lg text-blue-600 font-medium">
                    {pathway.fandomName}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Selected Tags
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {pathway.selectedTags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Plot Elements
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {pathway.selectedPlotBlocks.map((block, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm"
                      >
                        {block}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Statistics */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Search Results
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchStats.totalSearched.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Stories Searched</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {searchStats.exactMatches}
                  </div>
                  <div className="text-sm text-gray-600">Exact Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {searchStats.partialMatches}
                  </div>
                  <div className="text-sm text-gray-600">Partial Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {searchStats.searchTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Search Time</div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Matching Stories */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Matching Stories ({matchingStories.length})
                </h2>
                {matchingStories.length > 0 ? (
                  <div className="space-y-6">
                    {matchingStories.map(story => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Matching Stories Found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      We couldn't find any existing stories that match your
                      criteria.
                    </p>
                    <p className="text-sm text-gray-500">
                      Check out the story prompts on the right to create
                      something new!
                    </p>
                  </div>
                )}
              </div>

              {/* Story Prompts */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  New Story Prompts ({promptSuggestions.length})
                </h2>
                {promptSuggestions.length > 0 ? (
                  <div className="space-y-6">
                    {promptSuggestions.map(prompt => (
                      <PromptCard key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Prompts Available
                    </h3>
                    <p className="text-gray-600">
                      Unable to generate story prompts at this time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveWrapper>
    </ErrorBoundary>
  );
}

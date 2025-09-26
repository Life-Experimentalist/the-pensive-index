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
  Heart,
  MessageCircle,
  Calendar,
  Tag,
  TrendingUp,
  Eye,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ResponsiveWrapper } from '@/components/ui/responsive-wrapper';

// Types for story detail
interface StoryDetail {
  id: string;
  title: string;
  author: string;
  authorId: string;
  summary: string;
  description: string;
  tags: string[];
  plotBlocks: string[];
  fandomId: string;
  fandomName: string;
  rating: number;
  reviewCount: number;
  favoriteCount: number;
  followCount: number;
  viewCount: number;
  wordCount: number;
  chapterCount: number;
  readingTime: number;
  completionStatus: 'complete' | 'ongoing' | 'abandoned';
  publishedAt: string;
  updatedAt: string;
  url: string;
  language: string;
  warnings: string[];
  relationships: string[];
  characters: string[];
  chapters: {
    id: string;
    title: string;
    wordCount: number;
    publishedAt: string;
    summary?: string;
  }[];
}

interface RelatedStory {
  id: string;
  title: string;
  author: string;
  rating: number;
  completionStatus: string;
  matchingTags: string[];
  url: string;
}

interface ReaderEngagement {
  totalReads: number;
  uniqueReaders: number;
  averageReadingTime: number;
  completionRate: number;
  readerRetention: number;
  popularChapters: number[];
  readingTrends: {
    date: string;
    reads: number;
  }[];
}

interface StoryDetailData {
  story: StoryDetail;
  relatedStories: RelatedStory[];
  engagement: ReaderEngagement;
  similarPathways: {
    id: string;
    name: string;
    tags: string[];
    matchCount: number;
  }[];
}

// Mock data fetching function (will be replaced with actual service calls)
function fetchStoryDetail(storyId: string): StoryDetailData | null {
  try {
    // TODO: Replace with actual StoryService and AnalyticsService calls
    // const storyService = new StoryService();
    // const analyticsService = new AnalyticsService();

    // Mock data for development
    const mockData: StoryDetailData = {
      story: {
        id: storyId,
        title: 'The Power of Time and Heritage',
        author: 'TimeWriter',
        authorId: 'timewriter-123',
        summary:
          'Harry discovers his inheritance and uses a time turner to change everything, with Hermione by his side.',
        description:
          'When Harry Potter discovers an ancient inheritance that grants him unprecedented magical abilities, he must navigate the complexities of power, love, and responsibility. With Hermione Granger as his steadfast companion, they embark on a journey through time itself to right the wrongs of the past and secure a brighter future. But with great power comes great danger, and enemies both old and new seek to claim what Harry has gained. This epic tale explores themes of growth, sacrifice, and the bonds that tie us together across time itself.',
        tags: [
          'time-travel',
          'harry/hermione',
          'powerful-harry',
          'inheritance',
          'romance',
          'adventure',
        ],
        plotBlocks: [
          'Goblin Inheritance',
          'Time Turner Mishap',
          'Lordship Powers',
        ],
        fandomId: 'harry-potter',
        fandomName: 'Harry Potter',
        rating: 4.7,
        reviewCount: 234,
        favoriteCount: 456,
        followCount: 789,
        viewCount: 12450,
        wordCount: 87500,
        chapterCount: 15,
        readingTime: 45,
        completionStatus: 'complete',
        publishedAt: '2023-06-15T00:00:00Z',
        updatedAt: '2023-09-22T00:00:00Z',
        url: 'https://example.com/story/power-time-heritage',
        language: 'English',
        warnings: ['time-travel consequences', 'mild violence'],
        relationships: [
          'Harry Potter/Hermione Granger',
          'Ron Weasley/Luna Lovegood',
        ],
        characters: [
          'Harry Potter',
          'Hermione Granger',
          'Ron Weasley',
          'Albus Dumbledore',
        ],
        chapters: [
          {
            id: '1',
            title: 'The Inheritance Revealed',
            wordCount: 6200,
            publishedAt: '2023-06-15T00:00:00Z',
          },
          {
            id: '2',
            title: 'Gringotts Secrets',
            wordCount: 5800,
            publishedAt: '2023-06-22T00:00:00Z',
          },
          {
            id: '3',
            title: "Time's Embrace",
            wordCount: 7100,
            publishedAt: '2023-06-29T00:00:00Z',
          },
          // ... more chapters
        ],
      },
      relatedStories: [
        {
          id: '2',
          title: 'Heritage and Hearts',
          author: 'RomanceAuthor',
          rating: 4.3,
          completionStatus: 'ongoing',
          matchingTags: ['harry/hermione', 'powerful-harry'],
          url: 'https://example.com/story/heritage-hearts',
        },
        {
          id: '3',
          title: "The Time Traveler's Dilemma",
          author: 'TemporalWriter',
          rating: 4.5,
          completionStatus: 'complete',
          matchingTags: ['time-travel', 'inheritance'],
          url: 'https://example.com/story/time-dilemma',
        },
      ],
      engagement: {
        totalReads: 12450,
        uniqueReaders: 8900,
        averageReadingTime: 45,
        completionRate: 78,
        readerRetention: 85,
        popularChapters: [1, 3, 7, 12, 15],
        readingTrends: [
          { date: '2023-06', reads: 1200 },
          { date: '2023-07', reads: 2100 },
          { date: '2023-08', reads: 2800 },
          { date: '2023-09', reads: 3200 },
          { date: '2023-10', reads: 3150 },
        ],
      },
      similarPathways: [
        {
          id: 'pathway-1',
          name: 'Time Travel Romance',
          tags: ['time-travel', 'harry/hermione', 'romance'],
          matchCount: 3,
        },
        {
          id: 'pathway-2',
          name: 'Powerful Harry Adventures',
          tags: ['powerful-harry', 'inheritance', 'adventure'],
          matchCount: 3,
        },
      ],
    };

    return mockData;
  } catch (error) {
    console.error('Failed to fetch story detail:', error);
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
  const storyData = fetchStoryDetail(resolvedParams.id);

  if (!storyData) {
    return {
      title: 'Story Not Found - The Pensieve Index',
      description: 'The requested story could not be found.',
    };
  }

  const { story } = storyData;
  const title = `${story.title} by ${story.author}`;
  const description = story.summary;

  return {
    title: `${title} - The Pensieve Index`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://pensieve-index.com/story/${resolvedParams.id}`,
      siteName: 'The Pensieve Index',
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt,
      authors: [story.author],
      tags: story.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'story:id': resolvedParams.id,
      'story:fandom': story.fandomName,
      'story:author': story.author,
      'story:rating': story.rating.toString(),
      'story:status': story.completionStatus,
      'story:words': story.wordCount.toString(),
      'story:chapters': story.chapterCount.toString(),
    },
  };
}

// Related story card component
function RelatedStoryCard({ story }: { story: RelatedStory }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'ongoing':
        return 'text-blue-600 bg-blue-50';
      case 'abandoned':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <h4 className="font-medium text-gray-900 mb-2">{story.title}</h4>
      <p className="text-sm text-gray-600 mb-3">by {story.author}</p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-600">{story.rating}</span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs ${getStatusColor(
            story.completionStatus
          )}`}
        >
          {story.completionStatus}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {story.matchingTags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs"
          >
            {tag}
          </span>
        ))}
        {story.matchingTags.length > 3 && (
          <span className="text-gray-500 text-xs">
            +{story.matchingTags.length - 3}
          </span>
        )}
      </div>

      <a
        href={story.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        <span>Read Story</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// Chapter list component
function ChapterList({ chapters }: { chapters: StoryDetail['chapters'] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Chapters ({chapters.length})
        </h3>
      </div>
      <div className="divide-y">
        {chapters.slice(0, 5).map((chapter, index) => (
          <div key={chapter.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                  <span>
                    {new Date(chapter.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
        {chapters.length > 5 && (
          <div className="p-4 text-center">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Show all {chapters.length} chapters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Engagement stats component
function EngagementStats({ engagement }: { engagement: ReaderEngagement }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Reader Engagement
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {engagement.totalReads.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Reads</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {engagement.completionRate}%
          </div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {engagement.uniqueReaders.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Unique Readers</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">
            {engagement.readerRetention}%
          </div>
          <div className="text-sm text-gray-600">Retention Rate</div>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const storyData = fetchStoryDetail(resolvedParams.id);

  if (!storyData) {
    return notFound();
  }

  const { story, relatedStories, engagement, similarPathways } = storyData;

  const shareUrl = `https://pensieve-index.com/story/${resolvedParams.id}`;
  const shareText = `Check out "${story.title}" by ${story.author} - ${story.fandomName} fanfiction on The Pensieve Index`;

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
    <ErrorBoundary>
      <ResponsiveWrapper>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/fandom/${story.fandomId}`}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to {story.fandomName}</span>
                  </Link>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Bookmark className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Story Header */}
            <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {story.fandomName}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium border ${getStatusColor(
                        story.completionStatus
                      )}`}
                    >
                      {story.completionStatus}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {story.title}
                  </h1>
                  <p className="text-lg text-gray-600 mb-4">
                    by {story.author}
                  </p>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {story.summary}
                  </p>
                </div>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium ml-6"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Read Story</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Story Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold">{story.rating}</span>
                  </div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">{story.reviewCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">{story.favoriteCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">
                      {story.viewCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Views</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold">
                      {story.wordCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Words</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold">{story.readingTime}m</span>
                  </div>
                  <div className="text-sm text-gray-600">Read Time</div>
                </div>
              </div>

              {/* Tags and Elements */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {story.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
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
                  <div className="flex flex-wrap gap-2">
                    {story.plotBlocks.map((block, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm"
                      >
                        {block}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Story Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {story.description}
                  </p>
                </div>

                {/* Chapters */}
                <ChapterList chapters={story.chapters} />

                {/* Similar Pathways */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Discover Similar Stories
                  </h3>
                  <div className="space-y-3">
                    {similarPathways.map(pathway => (
                      <Link
                        key={pathway.id}
                        href={`/pathway/${pathway.id}`}
                        className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {pathway.name}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pathway.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                              {pathway.matchCount} matches
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Engagement Stats */}
                <EngagementStats engagement={engagement} />

                {/* Story Information */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Story Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Published:</span>
                      <span className="text-gray-900">
                        {new Date(story.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Updated:</span>
                      <span className="text-gray-900">
                        {new Date(story.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Language:</span>
                      <span className="text-gray-900">{story.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chapters:</span>
                      <span className="text-gray-900">
                        {story.chapterCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Words:</span>
                      <span className="text-gray-900">
                        {story.wordCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {story.warnings.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Content Warnings
                      </h4>
                      <div className="space-y-1">
                        {story.warnings.map((warning, index) => (
                          <span
                            key={index}
                            className="block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs"
                          >
                            {warning}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Related Stories */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Related Stories
                  </h3>
                  <div className="space-y-4">
                    {relatedStories.map(relatedStory => (
                      <RelatedStoryCard
                        key={relatedStory.id}
                        story={relatedStory}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveWrapper>
    </ErrorBoundary>
  );
}

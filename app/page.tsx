/**
 * Home Page - The Pensieve Index
 *
 * SSR homepage with fandom list, SEO optimization, and discovery interface entry point.
 * Includes proper metadata, Open Graph tags, and performance optimization.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import UserNavigation from '@/components/HomePage/UserNavigation';
import UserContent from '@/components/HomePage/UserContent';
import HydratedLink from '@/components/ui/HydratedLink';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { FandomModel } from '@/lib/database/models';

// SEO Metadata
export const metadata: Metadata = {
  title: 'The Pensieve Index - Library-First Story Discovery Platform',
  description:
    'Discover existing fanfiction stories and generate intelligent prompts for new content. Library-first approach prioritizing existing tagged stories with advanced search and relevance scoring.',
  keywords: [
    'fanfiction',
    'story discovery',
    'prompt generator',
    'library search',
    'tag-based search',
    'story recommendations',
    'creative writing',
    'fandom stories',
  ],
  authors: [{ name: 'The Pensieve Index' }],
  creator: 'The Pensieve Index',
  publisher: 'The Pensieve Index',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pensive-index.vercel.app',
    title: 'The Pensieve Index - Library-First Story Discovery',
    description:
      'Discover existing fanfiction stories and generate intelligent prompts for new content.',
    siteName: 'The Pensieve Index',
    images: [
      {
        url: '/logo-banner.png',
        width: 600,
        height: 200,
        alt: 'The Pensieve Index Logo',
      },
      {
        url: '/hero.png',
        width: 800,
        height: 400,
        alt: 'Story Discovery Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pensieve Index - Story Discovery Platform',
    description: 'Library-first fanfiction discovery with intelligent prompts',
    images: ['/logo-banner.png'],
  },
  alternates: {
    canonical: 'https://pensive-index.vercel.app',
  },
};

// Server-side data fetching for fandom list
async function getFandomsData() {
  try {
    const fandoms = await FandomModel.getAllActive();
    return fandoms.slice(0, 6); // Show top 6 popular fandoms on homepage
  } catch (error) {
    console.error('Failed to fetch fandoms:', error);
    return [];
  }
}

export default async function HomePage() {
  // Fetch fandoms for SSR
  const fandoms = await getFandomsData();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/icon.png"
                alt="The Pensieve Index"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold text-gray-900">
                The Pensieve Index
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserNavigation />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="bg-gradient-to-br from-blue-600 to-purple-700 min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Discover <span className="text-white">Fanfiction Stories</span>
              <br />
              <span className="text-cyan-300">Library First</span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed opacity-90">
            The intelligent{' '}
            <strong className="text-white">
              fanfiction story discovery platform
            </strong>{' '}
            that prioritizes finding existing tagged stories before generating
            new prompts. Built for readers who want{' '}
            <em className="text-white">precision</em> and writers who want{' '}
            <em className="text-white">inspiration</em> across
            <strong className="text-white">
              Harry Potter, Percy Jackson, and more fandoms
            </strong>
            .
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <HydratedLink
              href="/discover"
              className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🔍 Explore Stories
            </HydratedLink>
            <HydratedLink
              href="/generate"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
            >
              ⚡ Generate Prompts
            </HydratedLink>
          </div>

          {/* User Authentication */}
          <div className="mb-12">
            <UserContent />
          </div>

          {/* Interactive Demo Preview */}
          <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl p-8 max-w-4xl mx-auto border border-white border-opacity-30 shadow-2xl transform hover:scale-105 transition-all duration-700">
            <div className="text-left">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <div
                  className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className="w-3 h-3 bg-green-400 rounded-full animate-pulse"
                  style={{ animationDelay: '1s' }}
                ></div>
                <span className="text-white text-opacity-90 text-sm ml-4 font-medium">
                  ✨ Story Pathway Builder
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 bg-opacity-40 text-blue-100 rounded-full text-sm font-medium border border-blue-400 border-opacity-30 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer">
                    🕰️ Time Travel
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 bg-opacity-40 text-purple-100 rounded-full text-sm font-medium border border-purple-400 border-opacity-30 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer">
                    ⚡ Marauders Era
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 bg-opacity-40 text-green-100 rounded-full text-sm font-medium border border-green-400 border-opacity-30 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer">
                    💕 Harry/Hermione
                  </span>
                </div>
                <div className="bg-black bg-opacity-20 backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20">
                  <div className="flex items-center justify-between text-white text-opacity-90 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Search Complete</span>
                    </div>
                    <span className="text-xs text-white text-opacity-60">
                      342ms
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-white text-opacity-90 text-sm">
                      📚 Found{' '}
                      <span className="text-cyan-300 font-bold text-lg">
                        24 matching stories
                      </span>
                    </div>
                    <div className="text-white text-opacity-90 text-sm">
                      ✨{' '}
                      <span className="text-yellow-300 font-semibold">
                        Generate novel prompt
                      </span>{' '}
                      for unexplored combinations
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300 rounded-full mix-blend-overlay filter blur-xl opacity-15 animate-pulse"
            style={{ animationDelay: '2s' }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-300 rounded-full mix-blend-overlay filter blur-xl opacity-10 animate-pulse"
            style={{ animationDelay: '4s' }}
          ></div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose The Pensieve Index?
            </h2>
            <p className="text-xl text-gray-600">
              Advanced story discovery with intelligent prompt generation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📚 Story Discovery
              </h3>
              <p className="text-gray-600">
                Find existing tagged stories with advanced search and relevance
                scoring. Library-first approach prioritizes existing content.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ✨ Prompt Generation
              </h3>
              <p className="text-gray-600">
                Generate intelligent story prompts with novelty highlights for
                unexplored combinations and creative opportunities.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🎯 Smart Filtering
              </h3>
              <p className="text-gray-600">
                Advanced tag-based filtering with real-time validation and
                conflict detection for optimal results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fandoms Section */}
      {fandoms.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Explore Popular Fandoms
              </h2>
              <p className="text-xl text-gray-600">
                Start your story discovery journey
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {fandoms.map(fandom => (
                <HydratedLink
                  key={fandom.id}
                  href={`/fandom/${fandom.slug}`}
                  className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <div className="text-center">
                    <h3 className="font-semibold text-xl mb-2">
                      {fandom.name}
                    </h3>
                    <p className="text-sm opacity-90 mb-3">
                      {fandom.description || 'Explore this fandom'}
                    </p>
                    <div className="text-xs opacity-75">Click to explore →</div>
                  </div>
                </HydratedLink>
              ))}
            </div>

            <div className="text-center mt-12">
              <HydratedLink
                href="/discover"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200 shadow-lg"
              >
                Browse All Fandoms
                <svg
                  className="ml-2 -mr-1 w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </HydratedLink>
            </div>
          </div>
        </section>
      )}

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'The Pensieve Index',
            description:
              'Library-first story discovery platform and intelligent prompt generator for fanfiction',
            url: 'https://pensive-index.vercel.app',
            applicationCategory: 'Entertainment',
            operatingSystem: 'Web Browser',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            author: {
              '@type': 'Organization',
              name: 'The Pensieve Index',
            },
            featureList: [
              'Story Discovery with Advanced Search',
              'Intelligent Prompt Generation',
              'Real-time Validation',
              'Mobile and Desktop Support',
              'Tag-based Filtering',
              'Library-first Approach',
            ],
          }),
        }}
      />
    </div>
  );
}

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
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { FandomModel } from '@/lib/database/models';

// SEO Metadata
export const metadata: Metadata = {
  title: 'The Pensieve Index - Library-First Story Discovery Platform',
  description: 'Discover existing fanfiction stories and generate intelligent prompts for new content. Library-first approach prioritizing existing tagged stories with advanced search and relevance scoring.',
  keywords: [
    'fanfiction',
    'story discovery',
    'prompt generator',
    'library search',
    'tag-based search',
    'story recommendations',
    'creative writing',
    'fandom stories'
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
    description: 'Discover existing fanfiction stories and generate intelligent prompts for new content.',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Logo Banner */}
          <div className="mb-8">
            <Image
              src="/logo-banner.png"
              alt="The Pensieve Index - Logo Banner"
              width={600}
              height={200}
              className="mx-auto max-w-full h-auto"
              priority
            />
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{' '}
            <span className="text-indigo-600">The Pensieve Index</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A library-first story discovery platform and intelligent prompt
            generator for fanfiction.
          </p>

          <UserContent />

          {/* Discovery Interface Entry Point */}
          <div className="mt-8 mb-12">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Start Your Story Discovery Journey
              </h2>
              <p className="text-gray-600 mb-6">
                Choose a fandom to explore existing stories and generate new prompts
              </p>

              {fandoms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {fandoms.map((fandom) => (
                    <Link
                      key={fandom.id}
                      href={`/fandom/${fandom.slug}`}
                      className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                    >
                      <div className="text-center">
                        <h3 className="font-semibold text-lg mb-1">{fandom.name}</h3>
                        <p className="text-sm opacity-90">
                          {fandom.description || 'Explore this fandom'}
                        </p>
                        <div className="mt-2 text-xs opacity-75">
                          Click to explore →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-gray-600">
                    No fandoms available yet. Check back soon!
                  </p>
                </div>
              )}

              <Link
                href="/discover"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
              >
                Browse All Fandoms
                <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-12">
            <Image
              src="/hero.png"
              alt="The Pensieve Index - Hero Image"
              width={800}
              height={400}
              className="mx-auto max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📚 Story Discovery
              </h3>
              <p className="text-gray-600">
                Find existing tagged stories with advanced search and relevance
                scoring. Library-first approach prioritizes existing content.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ✨ Prompt Generation
              </h3>
              <p className="text-gray-600">
                Generate intelligent story prompts with novelty highlights for
                unexplored combinations and creative opportunities.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
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

        {/* Performance Stats */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Choose The Pensieve Index?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{'<200ms'}</div>
              <div className="text-sm text-gray-600 mt-1">Validation Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{'<500ms'}</div>
              <div className="text-sm text-gray-600 mt-1">Story Search Speed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">Library-First</div>
              <div className="text-sm text-gray-600 mt-1">Existing Stories Priority</div>
            </div>
          </div>
        </div>
      </main>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'The Pensieve Index',
            description: 'Library-first story discovery platform and intelligent prompt generator for fanfiction',
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
              'Library-first Approach'
            ],
          }),
        }}
      />
    </div>
  );
}

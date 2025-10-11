/**
 * Home Page - The Pensieve Index
 *
 * SSR homepage with fandom list, SEO optimization, and discovery interface entry point.
 * Includes proper metadata, Open Graph tags, and performance optimization.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import MainLayout from '@/components/layout/MainLayout';
import UserContent from '@/components/HomePage/UserContent';
import HydratedLink from '@/components/ui/HydratedLink';
import { Metadata } from 'next';
import { FandomModel } from '@/lib/database/models';

// SEO Metadata
export const metadata: Metadata = {
  title: 'The Pensieve Index - Discover Your Next Favorite Fanfiction',
  description:
    'The ultimate fanfiction discovery platform for readers and writers. Explore thousands of stories, build custom pathways, and find your perfect read across Harry Potter, Percy Jackson, and more fandoms.',
  keywords: [
    'fanfiction',
    'fanfic',
    'story discovery',
    'fandom',
    'Harry Potter fanfiction',
    'Percy Jackson fanfiction',
    'ao3',
    'fanfiction.net',
    'reading recommendations',
    'story finder',
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
    title: 'The Pensieve Index - Your Fanfiction Discovery Companion',
    description:
      'Discover, explore, and track your favorite fanfiction stories across multiple fandoms.',
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
        alt: 'Fanfiction Discovery Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pensieve Index - Discover Amazing Fanfiction',
    description: 'Your personalized fanfiction discovery and tracking platform',
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
    <MainLayout fullWidth className="!p-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white dark:bg-gray-800 opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white dark:bg-gray-800 opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              Discover Your Next
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Favorite Fanfiction
              </span>
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed opacity-95">
            Dive into thousands of{' '}
            <strong className="font-bold">tagged stories</strong> across your
            favorite fandoms.
            <br />
            Build custom pathways, discover hidden gems, and never run out of
            amazing reads.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <HydratedLink
              href="/fandom"
              className="px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              🌟 Browse Fandoms
            </HydratedLink>
            <HydratedLink
              href="/pathway"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white hover:text-indigo-600 transition-all duration-300 transform hover:scale-105"
            >
              🔮 Build Story Pathway
            </HydratedLink>
          </div>

          {/* User Authentication */}
          <div className="mb-12">
            <UserContent />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-4xl font-bold text-white mb-2">1000+</div>
              <div className="text-white text-opacity-90 text-sm">
                Tagged Stories
              </div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-white text-opacity-90 text-sm">Fandoms</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-white text-opacity-90 text-sm">
                Tags & Tropes
              </div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-white text-opacity-90 text-sm">
                Monthly Readers
              </div>
            </div>
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
                  <span className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 bg-opacity-40 text-pink-100 rounded-full text-sm font-medium border border-pink-400 border-opacity-30 backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer">
                    💕 Romance
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
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Everything You Need to Find Amazing Stories
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful features designed for fanfiction lovers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Smart Discovery
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Find exactly what you're looking for with our advanced tag-based
                search system. Filter by characters, pairings, tropes, and more.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Custom Pathways
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Build personalized story pathways by combining your favorite
                tags and tropes. Save and share your perfect combinations.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Real-Time Results
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Get instant results as you build your pathway. See matching
                stories and discover new combinations in real-time.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">🔖</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Save & Track
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Bookmark your favorite stories and pathways. Keep track of what
                you've read and what's on your to-read list.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Multi-Fandom
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Explore stories across dozens of fandoms from Harry Potter to
                Percy Jackson and beyond. All in one place.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Writer's Helper
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Discover gaps in existing stories and get inspired to write what
                readers are looking for. Generate creative prompts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fandoms Section */}
      {fandoms.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Dive Into Your Favorite Fandoms
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Thousands of stories waiting to be discovered
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {fandoms.map(fandom => (
                <HydratedLink
                  key={fandom.id}
                  href={`/fandom/${fandom.slug}`}
                  className="group bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white rounded-lg p-6 hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
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
                href="/fandom"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-indigo-600 dark:border-indigo-400 text-lg font-bold rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                Browse All Fandoms
                <svg
                  className="ml-2 -mr-1 w-5 h-5"
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
              'Fanfiction discovery platform for readers and writers across multiple fandoms',
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
              'Advanced Story Discovery',
              'Custom Story Pathways',
              'Tag-Based Filtering',
              'Multi-Fandom Support',
              'Real-Time Search Results',
              'Story Bookmarking',
              'Writer Inspiration Tools',
            ],
          }),
        }}
      />
    </MainLayout>
  );
}

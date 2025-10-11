/**
 * Fandom Library Page
 *
 * Browse all fandoms with carousel/grid view and search functionality
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { FandomModel } from '@/lib/database/models';
import FandomCarousel from './FandomCarousel';
import FandomSearch from './FandomSearch';

export const metadata: Metadata = {
  title: 'Fandom Library - The Pensieve Index',
  description:
    'Browse all fandoms available on The Pensieve Index. Discover stories from Harry Potter, Percy Jackson, and more.',
  openGraph: {
    title: 'Fandom Library - The Pensieve Index',
    description: 'Browse all available fandoms and discover fanfiction stories',
  },
};

// Server-side data fetching with timeout and error handling
async function getAllFandoms() {
  try {
    console.log('[Fandom Page] Starting fandom data fetch...');
    const startTime = Date.now();

    const fandoms = await FandomModel.getAllActive();

    const fetchTime = Date.now() - startTime;
    console.log(
      `[Fandom Page] Fetched ${fandoms.length} fandoms in ${fetchTime}ms`
    );

    return fandoms;
  } catch (error) {
    console.error('[Fandom Page] Failed to fetch fandoms:', error);
    return [];
  }
}

export default async function FandomLibraryPage() {
  console.log('[Fandom Page] Rendering Fandom Library Page...');
  const fandoms = await getAllFandoms();
  console.log('[Fandom Page] Fandoms loaded, rendering UI...');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <Image
                  src="/icon.png"
                  alt="The Pensieve Index"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  The Pensieve Index
                </h1>
              </Link>
            </div>
            <Link
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore Fandoms
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover stories from your favorite fandoms. Select a fandom to
            browse tagged stories, build story pathways, and generate prompts.
          </p>
        </div>

        {/* Search */}
        <FandomSearch fandoms={fandoms} />

        {/* Featured Fandoms Carousel */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Featured Fandoms
          </h2>
          <FandomCarousel fandoms={fandoms.slice(0, 10)} />
        </section>

        {/* All Fandoms Grid */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            All Fandoms ({fandoms.length})
          </h2>

          {fandoms.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No fandoms available yet.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Check back soon for new fandoms!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fandoms.map(fandom => (
                <Link
                  key={fandom.id}
                  href={`/fandom/${fandom.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
                >
                  {/* Fandom Header with gradient */}
                  <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-opacity"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white text-xl font-bold truncate">
                        {fandom.name}
                      </h3>
                    </div>
                  </div>

                  {/* Fandom Content */}
                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {fandom.description || 'Explore stories from this fandom'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          --
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Stories
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          --
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Tags
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          --
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          tropes
                        </div>
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 font-medium text-sm flex items-center justify-center">
                        Browse Fandom
                        <svg
                          className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Can't find your fandom?</h2>
          <p className="text-lg mb-6 text-white text-opacity-90">
            We're constantly adding new fandoms! Request yours or contribute
            tagged stories to expand our library.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/extension"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Submit Stories
            </Link>
            <Link
              href="/admin"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Request Fandom
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

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
import { getFandoms } from '@/lib/utils/fandom';
import FandomCarousel from './FandomCarousel';
import FandomSearch from './FandomSearch';
import MainLayout from '@/components/layout/MainLayout';

export const metadata: Metadata = {
  title: 'Fandom Library - The Pensieve Index',
  description:
    'Browse all fandoms available on The Pensieve Index. Discover stories from Harry Potter, Percy Jackson, and more.',
  openGraph: {
    title: 'Fandom Library - The Pensieve Index',
    description: 'Browse all available fandoms and discover fanfiction stories',
  },
};

export default async function FandomLibraryPage() {
  console.log('[Fandom Page] Rendering Fandom Library Page...');
  // Fetch all fandoms for library page
  const fandoms = await getFandoms();
  console.log('[Fandom Page] Fandoms loaded, rendering UI...');

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Explore Fandoms
        </h1>
        <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
          Discover stories from your favorite fandoms. Select a fandom to browse
          tagged stories, build story pathways, and generate prompts.
        </p>
      </div>

      {/* Search */}
      <FandomSearch fandoms={fandoms} />

      {/* Featured Fandoms Carousel */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Featured Fandoms
        </h2>
        <FandomCarousel fandoms={fandoms.slice(0, 10)} />
      </section>

      {/* All Fandoms Grid */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          All Fandoms ({fandoms.length})
        </h2>

        {fandoms.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-foreground/60 text-lg">
              No fandoms available yet.
            </p>
            <p className="text-foreground/40 text-sm mt-2">
              Check back soon for new fandoms!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fandoms.map(fandom => (
              <Link
                key={fandom.id}
                href={`/fandom/${fandom.slug}`}
                className="bg-card rounded-lg shadow-sm border border-border hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
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
                  <p className="text-foreground/70 text-sm mb-4 line-clamp-2">
                    {fandom.description || 'Explore stories from this fandom'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        --
                      </div>
                      <div className="text-xs text-foreground/60">Stories</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        --
                      </div>
                      <div className="text-xs text-foreground/60">Tags</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        --
                      </div>
                      <div className="text-xs text-foreground/60">tropes</div>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="text-primary group-hover:text-primary/80 font-medium text-sm flex items-center justify-center">
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
    </MainLayout>
  );
}

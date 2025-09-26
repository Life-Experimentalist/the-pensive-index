/**
 * Fandom Discovery Page - T046
 *
 * Dynamic fandom discovery page with URL-based fandom selection, pathway building interface,
 * and proper error boundaries. Includes breadcrumb navigation and social sharing.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { FandomModel, TagModel, PlotBlockModel } from '@/lib/database/models';
import { ResponsiveWrapper } from '@/components/discovery/responsive-wrapper';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface FandomPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    pathway?: string;
    view?: 'desktop' | 'mobile';
  }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: FandomPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const fandom = await FandomModel.getBySlug(resolvedParams.slug);

  if (!fandom) {
    return {
      title: 'Fandom Not Found - The Pensieve Index',
      description: 'The requested fandom could not be found.',
    };
  }

  return {
    title: `${fandom.name} - Story Discovery | The Pensieve Index`,
    description: `Discover ${
      fandom.name
    } fanfiction stories and generate creative prompts. ${
      fandom.description ||
      `Explore tags, plot blocks, and existing stories in the ${fandom.name} universe.`
    }`,
    keywords: [
      fandom.name,
      'fanfiction',
      'story discovery',
      'creative writing',
      'prompt generator',
      'tag-based search',
    ],
    openGraph: {
      title: `${fandom.name} Story Discovery`,
      description: `Find existing ${fandom.name} stories and generate new prompts`,
      type: 'website',
      url: `https://pensive-index.vercel.app/fandom/${fandom.slug}`,
      siteName: 'The Pensieve Index',
      images: [
        {
          url: '/logo-banner.png',
          width: 600,
          height: 200,
          alt: `${fandom.name} - The Pensieve Index`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fandom.name} Story Discovery`,
      description: `Discover ${fandom.name} fanfiction with intelligent search and prompts`,
    },
    alternates: {
      canonical: `https://pensive-index.vercel.app/fandom/${fandom.slug}`,
    },
  };
}

// Server-side data fetching
async function getFandomData(slug: string) {
  try {
    const fandom = await FandomModel.getBySlug(slug);
    if (!fandom) {
      return null;
    }

    // Fetch fandom elements in parallel
    const [tags, plotBlocks] = await Promise.all([
      TagModel.getByFandom(fandom.id),
      PlotBlockModel.getRootBlocks(fandom.id),
    ]);

    return {
      fandom,
      tags,
      plotBlocks,
    };
  } catch (error) {
    console.error('Failed to fetch fandom data:', error);
    return null;
  }
}

// Loading component for Suspense
function FandomLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default async function FandomDiscoveryPage({
  params,
  searchParams,
}: FandomPageProps) {
  const resolvedParams = await params;
  const data = await getFandomData(resolvedParams.slug);

  if (!data) {
    notFound();
  }

  const { fandom, tags, plotBlocks } = data;

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an error while loading the discovery interface.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header with breadcrumb navigation */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <Link
                  href="/"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Home
                </Link>
                <span>/</span>
                <Link
                  href="/discover"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Discover
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{fandom.name}</span>
              </nav>

              {/* Social Sharing */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${fandom.name} Story Discovery`,
                        text: `Discover ${fandom.name} fanfiction stories`,
                        url: window.location.href,
                      });
                    } else {
                      // Fallback to clipboard
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Share this page"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Fandom Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              {fandom.name}
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500">
              {fandom.description ||
                `Discover stories and generate prompts in the ${fandom.name} universe`}
            </p>

            {/* Fandom Statistics */}
            <div className="mt-6 flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {tags.length}
                </div>
                <div className="text-sm text-gray-500">Tags Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {plotBlocks.length}
                </div>
                <div className="text-sm text-gray-500">Plot Blocks</div>
              </div>
            </div>
          </div>

          {/* Discovery Interface */}
          <Suspense fallback={<FandomLoading />}>
            <ResponsiveWrapper
              selectedFandomSlug={fandom.slug}
              className="mt-8"
            />
          </Suspense>
        </main>

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: `${fandom.name} Story Discovery`,
              description:
                fandom.description ||
                `Discover ${fandom.name} fanfiction stories and generate creative prompts`,
              url: `https://pensive-index.vercel.app/fandom/${fandom.slug}`,
              isPartOf: {
                '@type': 'WebSite',
                name: 'The Pensieve Index',
                url: 'https://pensive-index.vercel.app',
              },
              breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: 'https://pensive-index.vercel.app',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Discover',
                    item: 'https://pensive-index.vercel.app/discover',
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: fandom.name,
                    item: `https://pensive-index.vercel.app/fandom/${fandom.slug}`,
                  },
                ],
              },
              mainEntity: {
                '@type': 'Thing',
                name: fandom.name,
                description: fandom.description,
              },
            }),
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

// Generate static params for popular fandoms (optional optimization)
export async function generateStaticParams() {
  try {
    const fandoms = await FandomModel.getAllActive();
    // Generate static pages for top 10 most popular fandoms
    return fandoms.slice(0, 10).map(fandom => ({
      slug: fandom.slug,
    }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}

// Enable ISR (Incremental Static Regeneration) for better performance
export const revalidate = 3600; // Revalidate every hour

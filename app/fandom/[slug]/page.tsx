/**
 * Fandom Discovery Page
 *
 * Dynamic fandom discovery page with URL-based fandom selection, pathway building interface,
 * and proper error boundaries. Includes breadcrumb navigation and social sharing.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FandomModel, TagModel, PlotBlockModel } from '@/lib/database/models';
import { ResponsiveWrapper } from '@/components/discovery/responsive-wrapper';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import MainLayout from '@/components/layout/MainLayout';
import FandomErrorFallback from './FandomErrorFallback';

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
      `Explore tags, tropes, and existing stories in the ${fandom.name} universe.`
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

    console.log('[Fandom Page] Fetching data for fandom:', {
      id: fandom.id,
      slug: fandom.slug,
      name: fandom.name,
    });

    // Fetch fandom elements in parallel
    const [tags, plotBlocks] = await Promise.all([
      TagModel.getByFandom(fandom.id),
      PlotBlockModel.getRootBlocks(fandom.id),
    ]);

    console.log('[Fandom Page] Fetched counts:', {
      tags: tags.length,
      plotBlocks: plotBlocks.length,
    });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
    <ErrorBoundary fallback={<FandomErrorFallback />}>
      <MainLayout
        fullWidth
        breadcrumbs={[
          { label: 'Fandoms', href: '/fandom' },
          { label: fandom.name },
        ]}
        showShare={true}
        shareData={{
          title: `${fandom.name} Story Discovery`,
          text: `Discover ${fandom.name} fanfiction stories on The Pensieve Index`,
        }}
      >
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Fandom Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
                {fandom.name}
              </h1>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300">
                {fandom.description ||
                  `Discover stories and generate prompts in the ${fandom.name} universe`}
              </p>

              {/* Fandom Statistics */}
              <div className="mt-6 flex justify-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {tags.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tags Available
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {plotBlocks.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tropes
                  </div>
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
          </div>

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
                      name: 'Fandoms',
                      item: 'https://pensive-index.vercel.app/fandom',
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
      </MainLayout>
    </ErrorBoundary>
  );
}

// Generate static params for popular fandoms (optional optimization)
// Only generate during development to avoid build-time database errors
export async function generateStaticParams() {
  // Skip static generation in production builds to avoid database access errors
  try {
    const fandoms = await FandomModel.getAllActive();
    // Generate static pages for top 10 most popular fandoms
    return fandoms.slice(0, 10).map(fandom => ({
      slug: fandom.slug,
    }));
  } catch (error) {
    console.error(
      '[Fandom] Database unavailable during static params generation:',
      error
    );
    // Fallback: return empty array if database is not accessible at build time
    return [];
  }
}

// Enable dynamic rendering for database-dependent pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Enable ISR (Incremental Static Regeneration) for better performance
export const revalidate = 3600; // Revalidate every hour

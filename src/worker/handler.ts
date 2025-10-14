/**
 * Cloudflare Worker Request Handler
 *
 * Simple pass-through worker that serves the Next.js application.
 * Handles only SEO files (robots.txt, sitemap.xml) and forwards everything else to Next.js.
 *
 * @package the-pensive-index
 * @version 2.0.0
 */

interface Env {
  ENVIRONMENT?: string;
  ASSETS: any; // Cloudflare Pages asset fetcher
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// SEO Helper: robots.txt
function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /api/admin/
Disallow: /admin/
Disallow: /_next/
Disallow: /api/internal/

# Crawl-Delay for polite bots
Crawl-delay: 1

# Sitemap
Sitemap: https://pensive.vkrishna04.me/sitemap.xml

# Popular search engine bots
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2`;
}

// SEO Helper: sitemap.xml
function generateSitemap(): string {
  const currentDate = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://pensive.vkrishna04.me/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Core Pages -->
  <url>
    <loc>https://pensive.vkrishna04.me/search</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://pensive.vkrishna04.me/fandom/harry-potter</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://pensive.vkrishna04.me/fandom/percy-jackson</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
}

/**
 * Main request handler
 *
 * Routes:
 * - /robots.txt -> Generated SEO file
 * - /sitemap.xml -> Generated SEO file
 * - /api/health -> Health check
 * - Everything else -> Next.js app (via ASSETS binding or passthrough)
 */
export function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Response | Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle robots.txt
  if (pathname === '/robots.txt') {
    return new Response(generateRobotsTxt(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Handle sitemap.xml
  if (pathname === '/sitemap.xml') {
    return new Response(generateSitemap(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Handle API health check
  if (pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: env.ENVIRONMENT || 'production',
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  // Everything else: Forward to Next.js app
  // Cloudflare Pages will handle the Next.js application
  // This worker just adds SEO files and health checks

  // In development with wrangler dev, ASSETS binding doesn't exist
  // Return helpful message to use npm run dev for Next.js
  if (!env.ASSETS) {
    return new Response(
      JSON.stringify({
        error: 'Development Mode',
        message: 'ASSETS binding not available in wrangler dev',
        instructions: [
          'For local development, use: npm run dev',
          'This worker is designed for Cloudflare Pages deployment',
          'In production, ASSETS binding serves the Next.js app',
        ],
        availableEndpoints: {
          '/robots.txt': 'SEO robots file',
          '/sitemap.xml': 'SEO sitemap',
          '/api/health': 'Health check',
        },
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  return env.ASSETS.fetch(request);
}

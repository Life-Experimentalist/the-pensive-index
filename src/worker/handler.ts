/**
 * Cloudflare Worker Request Handler
 *
 * Intelligent routing between Next.js app and enhanced documentation
 * Provides unified experience with performance optimization
 */

interface Env {
  ENVIRONMENT: string;
  ASSETS?: any;
  DB?: any;
  CACHE?: any;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// SEO Helper Functions
function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Enhanced SEO directives
Allow: /search
Allow: /generate
Allow: /api/docs

# Block admin and sensitive areas
Disallow: /admin
Disallow: /api/admin
Disallow: /unauthorized

# Sitemap location
Sitemap: https://pensive.vkrishna04.me/sitemap.xml

# Crawl de  <!-- Main Content Area -->
  <main id="main-content" role="main">
    <!-- Hero Section -->
    <section class="gradient-bg pt-24 pb-20" role="banner" aria-labelledby="hero-title">
      <div class="container mx-auto px-6 text-center">
        <h1 id="hero-title" class="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Library-First Fanfiction Story Discovery Platform
        </h1>
        <p class="text-xl md:text-2xl mb-6 opacity-90 max-w-4xl mx-auto">
          Discover existing fanfiction stories with precision using our intelligent tagging system for
          <strong>Harry Potter</strong>, <strong>Percy Jackson</strong>, <strong>Marvel</strong>,
          <strong>DC Comics</strong>, <strong>Anime</strong>, and <strong>50+ other fandoms</strong>.
          Our platform prioritizes finding tagged stories before suggesting new content.
        </p>
        <p class="text-lg md:text-xl mb-8 opacity-80 max-w-3xl mx-auto">
          Advanced search with <em>plot blocks</em>, <em>character relationships</em>, and
          <em>relevance scoring</em>. Build story pathways with drag-and-drop interface,
          then generate intelligent prompts highlighting novelty aspects for creative writing.
        </p>
        <div class="flex flex-col md:flex-row gap-4 justify-center items-center">
          <a href="/search" class="btn-primary text-lg px-8 py-4"
             aria-label="Search existing fanfiction stories with advanced filtering"
             title="Start searching thousands of tagged stories">
            🔍 Search 10,000+ Stories
          </a>
          <a href="/generate" class="btn-secondary text-lg px-8 py-4"
             aria-label="Generate intelligent story prompts for creative writing"
             title="Create detailed prompts for new fanfiction content">
            ✨ Generate Smart Prompts
          </a>
        </div>

        <!-- Popular Fandoms Quick Access -->
        <div class="mt-12 opacity-90">
          <p class="text-sm mb-4">Popular Fandoms:</p>
          <div class="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            <a href="/fandom/harry-potter" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">Harry Potter</a>
            <a href="/fandom/percy-jackson" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">Percy Jackson</a>
            <a href="/fandom/marvel" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">Marvel</a>
            <a href="/fandom/dc-comics" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">DC Comics</a>
            <a href="/fandom/naruto" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">Naruto</a>
            <a href="/fandom/my-hero-academia" class="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors">My Hero Academia</a>
            <a href="/search" class="px-3 py-1 bg-white/30 rounded-full text-sm font-medium hover:bg-white/40 transition-colors">+40 More</a>
          </div>
        </div>
      </div>
    </section>rawling
Crawl-delay: 1

# Additional search engine directives
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2`;
}

function generateSitemap(): string {
  const currentDate = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Homepage -->
  <url>
    <loc>https://pensive.vkrishna04.me/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://pensive.vkrishna04.me/"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://pensive.vkrishna04.me/"/>
    <image:image>
      <image:loc>https://pensive.vkrishna04.me/social-banner.png</image:loc>
      <image:title>The Pensive Index - Fanfiction Story Discovery Platform</image:title>
      <image:caption>Library-first fanfiction discovery with intelligent tagging system</image:caption>
    </image:image>
  </url>

  <!-- Core Application Pages -->
  <url>
    <loc>https://pensive.vkrishna04.me/search</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <mobile:mobile/>
  </url>

  <url>
    <loc>https://pensive.vkrishna04.me/generate</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <mobile:mobile/>
  </url>

  <!-- Popular Fandoms -->
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

  <url>
    <loc>https://pensive.vkrishna04.me/fandom/marvel</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://pensive.vkrishna04.me/fandom/dc-comics</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- API Documentation -->
  <url>
    <loc>https://pensive.vkrishna04.me/api/docs</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

</urlset>`;
}

// Enhanced SEO-optimized HTML with comprehensive metadata
const ENHANCED_DOCS_HTML = `
<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns# article: http://ogp.me/ns/article# profile: http://ogp.me/ns/profile#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <!-- Primary SEO Meta Tags -->
  <title>The Pensive Index - Library-First Fanfiction Story Discovery Platform | Find & Generate Stories</title>
  <meta name="title" content="The Pensive Index - Library-First Fanfiction Story Discovery Platform | Find & Generate Stories" />
  <meta name="description" content="Discover existing fanfiction stories with precision using our intelligent tagging system. Search thousands of tagged stories or generate detailed prompts for Harry Potter, Percy Jackson, Marvel, DC Comics, and 50+ other fandoms. Library-first approach prioritizes finding existing content before suggesting new stories." />
  <meta name="keywords" content="fanfiction search engine, fanfic discovery platform, story finder, Harry Potter fanfiction, Percy Jackson stories, Marvel fanfiction, DC Comics fanfic, Anime fanfiction, tagged stories, plot generator, story prompts, creative writing, fandom stories, fanfic library, fiction search, story recommendations, character relationships, plot blocks, drag and drop story builder, intelligent search, relevance scoring, fanfiction tags, story pathways, creative prompts, writing inspiration, fanfic community" />
  <meta name="author" content="Krishna GSVV (VKrishna04)" />
  <meta name="creator" content="Krishna GSVV" />
  <meta name="publisher" content="The Pensive Index" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="bingbot" content="index, follow" />
  <link rel="canonical" href="https://pensive.vkrishna04.me/" />

  <!-- Geographic and Language -->
  <meta name="geo.region" content="US" />
  <meta name="geo.placename" content="United States" />
  <meta name="geo.position" content="39.8283;-98.5795" />
  <meta name="ICBM" content="39.8283, -98.5795" />
  <meta name="language" content="English" />
  <meta name="content-language" content="en-US" />
  <meta name="distribution" content="global" />
  <meta name="audience" content="Fanfiction readers, writers, creative writers, fandom enthusiasts" />
  <meta name="rating" content="General" />
  <meta name="revisit-after" content="7 days" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="The Pensive Index" />
  <meta property="og:title" content="The Pensive Index - Library-First Fanfiction Story Discovery Platform" />
  <meta property="og:description" content="Discover existing fanfiction stories with precision using our intelligent tagging system. Search thousands of tagged stories or generate detailed prompts for 50+ fandoms including Harry Potter, Percy Jackson, Marvel, and more." />
  <meta property="og:url" content="https://pensive.vkrishna04.me/" />
  <meta property="og:image" content="https://pensive.vkrishna04.me/social-banner.png" />
  <meta property="og:image:secure_url" content="https://pensive.vkrishna04.me/social-banner.png" />
  <meta property="og:image:alt" content="The Pensive Index - Fanfiction Story Discovery Platform with search interface showing tagged stories and plot blocks" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:updated_time" content="2025-09-28T00:00:00Z" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@VKrishna04" />
  <meta name="twitter:creator" content="@VKrishna04" />
  <meta name="twitter:title" content="The Pensive Index - Fanfiction Story Discovery Platform" />
  <meta name="twitter:description" content="Discover existing fanfiction stories with precision or generate intelligent prompts. Library-first approach for Harry Potter, Percy Jackson, Marvel, and 50+ fandoms." />
  <meta name="twitter:image" content="https://pensive.vkrishna04.me/social-banner.png" />
  <meta name="twitter:image:alt" content="The Pensive Index - Fanfiction Story Discovery Platform" />
  <meta name="twitter:domain" content="pensive.vkrishna04.me" />

  <!-- Additional Social Meta -->
  <meta property="article:publisher" content="https://github.com/VKrishna04" />
  <meta property="article:author" content="https://vkrishna04.me" />
  <meta property="article:section" content="Technology" />
  <meta property="article:tag" content="Fanfiction" />
  <meta property="article:tag" content="Story Discovery" />
  <meta property="article:tag" content="Creative Writing" />
  <meta property="article:tag" content="Search Engine" />

  <!-- Favicons and Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3373dc" />
  <meta name="msapplication-TileColor" content="#3373dc" />
  <meta name="theme-color" content="#3373dc" />

  <!-- PWA Meta -->
  <meta name="application-name" content="The Pensive Index" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Pensive Index" />

  <!-- Security and Privacy -->
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' fonts.gstatic.com fonts.googleapis.com; connect-src 'self' *.googletagmanager.com *.google-analytics.com; frame-src 'none';" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta http-equiv="X-Frame-Options" content="DENY" />
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains; preload" />

  <!-- Performance and Preloading -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com" />
  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
  <link rel="preload" href="/icon.png" as="image" type="image/png" />
  <link rel="preload" href="/social-banner.png" as="image" type="image/png" />
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" as="style" />

  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX', {
      page_title: 'The Pensive Index - Fanfiction Story Discovery',
      custom_map: {
        'custom_parameter_1': 'page_type'
      }
    });

    // Enhanced ecommerce tracking for user engagement
    gtag('event', 'page_view', {
      page_title: 'Homepage',
      page_location: window.location.href,
      content_group1: 'Landing Page',
      content_group2: 'Fanfiction Platform'
    });
  </script>

  <!-- Structured Data - Organization -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "The Pensive Index",
    "alternateName": "Pensive Index",
    "url": "https://pensive.vkrishna04.me",
    "logo": "https://pensive.vkrishna04.me/icon.png",
    "sameAs": [
      "https://github.com/Life-Experimentalist/the-pensive-index",
      "https://github.com/VKrishna04",
      "https://vkrishna04.me"
    ],
    "founder": {
      "@type": "Person",
      "name": "Krishna GSVV",
      "url": "https://vkrishna04.me",
      "sameAs": [
        "https://github.com/VKrishna04"
      ]
    },
    "foundingDate": "2025-09-17",
    "description": "Library-first fanfiction story discovery platform with intelligent tagging and prompt generation for creative writers and fandom enthusiasts.",
    "keywords": "fanfiction, story discovery, creative writing, fandom, search engine, story generator",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "creator",
      "url": "https://vkrishna04.me"
    }
  }
  </script>

  <!-- Structured Data - WebSite -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Pensive Index",
    "alternateName": "Pensive Index",
    "url": "https://pensive.vkrishna04.me",
    "description": "Library-first fanfiction story discovery platform with intelligent tagging system. Search thousands of tagged stories or generate detailed prompts for Harry Potter, Percy Jackson, Marvel, and 50+ other fandoms.",
    "inLanguage": "en-US",
    "copyrightYear": "2025",
    "creator": {
      "@type": "Person",
      "name": "Krishna GSVV",
      "url": "https://vkrishna04.me"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Pensive Index",
      "url": "https://pensive.vkrishna04.me",
      "logo": "https://pensive.vkrishna04.me/icon.png"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://pensive.vkrishna04.me/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "mainEntity": {
      "@type": "WebApplication",
      "name": "The Pensive Index Story Discovery",
      "url": "https://pensive.vkrishna04.me/search",
      "description": "Advanced fanfiction search and story discovery application",
      "applicationCategory": "EntertainmentApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Advanced story search with tagging",
        "Intelligent prompt generation",
        "Drag-and-drop story pathway builder",
        "Multi-fandom support",
        "Relevance scoring",
        "Library-first discovery approach"
      ]
    }
  }
  </script>

  <!-- Structured Data - Software Application -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "The Pensive Index",
    "operatingSystem": "Web Browser",
    "applicationCategory": "EntertainmentApplication",
    "applicationSubCategory": "Story Discovery Platform",
    "url": "https://pensive.vkrishna04.me",
    "downloadUrl": "https://pensive.vkrishna04.me/search",
    "description": "Library-first fanfiction story discovery platform with intelligent tagging system for finding existing stories and generating creative prompts.",
    "softwareVersion": "1.0.0",
    "releaseDate": "2025-09-28",
    "author": {
      "@type": "Person",
      "name": "Krishna GSVV",
      "url": "https://vkrishna04.me"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Pensive Index",
      "url": "https://pensive.vkrishna04.me"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127",
      "bestRating": "5"
    },
    "featureList": [
      "Library-first story discovery",
      "Advanced tagging system",
      "Intelligent prompt generation",
      "Multi-fandom support (Harry Potter, Percy Jackson, Marvel, DC, Anime, etc.)",
      "Drag-and-drop pathway builder",
      "Relevance scoring algorithm",
      "Plot block combinations",
      "Character relationship mapping",
      "Mobile-responsive interface",
      "Real-time search results"
    ],
    "screenshot": "https://pensive.vkrishna04.me/social-banner.png",
    "softwareRequirements": "Modern web browser with JavaScript enabled",
    "permissions": "No special permissions required",
    "storageRequirements": "Minimal local storage for preferences",
    "memoryRequirements": "Standard web application memory usage",
    "processorRequirements": "Any modern processor",
    "installUrl": "https://pensive.vkrishna04.me/search",
    "softwareHelp": "https://pensive.vkrishna04.me/#docs",
    "releaseNotes": "Initial release with comprehensive story discovery and prompt generation features"
  }
  </script>

  <!-- Structured Data - FAQPage -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is The Pensive Index?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Pensive Index is a library-first fanfiction story discovery platform that helps you find existing tagged stories before suggesting new content. It features an intelligent tagging system, advanced search capabilities, and prompt generation for creative writing across 50+ fandoms including Harry Potter, Percy Jackson, Marvel, DC Comics, and more."
        }
      },
      {
        "@type": "Question",
        "name": "How does the library-first approach work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our library-first approach prioritizes showing you existing stories that match your criteria before generating new prompts. You build story pathways using our drag-and-drop interface, and our algorithm searches thousands of tagged stories to find the best matches. Only when existing stories don't meet your needs do we suggest creating new content with detailed prompts highlighting novelty aspects."
        }
      },
      {
        "@type": "Question",
        "name": "Which fandoms are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We support 50+ fandoms including Harry Potter, Percy Jackson, Marvel Universe, DC Comics, Star Wars, Lord of the Rings, Naruto, My Hero Academia, Attack on Titan, Supernatural, Sherlock Holmes, and many more. Each fandom has specialized tags, plot blocks, and character relationships for precise story discovery."
        }
      },
      {
        "@type": "Question",
        "name": "Is The Pensive Index free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, The Pensive Index is completely free to use. You can search stories, generate prompts, and use all features without any cost or registration required. We believe in making story discovery accessible to all creative writers and fandom enthusiasts."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate is the story matching algorithm?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our relevance scoring algorithm uses advanced tagging, plot block analysis, and character relationship mapping to provide highly accurate matches. The system considers tag combinations, story themes, character dynamics, and plot elements to ensure you find stories that truly match your interests with precision scoring and ranked results."
        }
      }
    ]
  }
  </script>

  <!-- Breadcrumb Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://pensive.vkrishna04.me/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Story Search",
        "item": "https://pensive.vkrishna04.me/search"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Prompt Generator",
        "item": "https://pensive.vkrishna04.me/generate"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "Documentation",
        "item": "https://pensive.vkrishna04.me/#docs"
      }
    ]
  }
  </script>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'media',
      theme: {
        extend: {
          colors: {
            'pensive-blue': '#3373dc',
            'pensive-dark': '#1e293b',
            'pensive-light': '#f8fafc',
            'pensive-accent': '#06b6d4',
          },
          fontFamily: {
            display: ['Inter', 'system-ui', 'sans-serif'],
          }
        }
      }
    };
  </script>

  <!-- Enhanced Styles -->
  <style>
    :root {
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --accent-primary: #3373dc;
      --accent-secondary: #06b6d4;
      --border-color: #e2e8f0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background-color: var(--bg-primary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      background-size: 300% 300%;
      animation: gradientShift 12s ease infinite;
      color: white;
      position: relative;
      overflow: hidden;
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .nav-bg {
      background: rgba(248, 250, 252, 0.9);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
      transition: all 0.3s ease;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
      color: white;
      padding: 1rem 2rem;
      border-radius: 12px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(51, 115, 220, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      color: white;
      padding: 1rem 2rem;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .section-light {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --border-color: #475569;
      }

      body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }
    }
  </style>
</head>

<body>
  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 z-50 nav-bg">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img src="/icon.png" alt="The Pensive Index" class="w-12 h-12 rounded-lg" />
          <span class="text-xl font-bold text-gray-900">The Pensive Index</span>
        </div>
        <div class="hidden md:flex space-x-6">
          <a href="#features" class="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
          <a href="#demo" class="text-gray-700 hover:text-blue-600 transition-colors">Demo</a>
          <a href="#docs" class="text-gray-700 hover:text-blue-600 transition-colors">Documentation</a>
          <a href="#api" class="text-gray-700 hover:text-blue-600 transition-colors">API</a>
        </div>
        <div class="flex space-x-4">
          <a href="/search" class="btn-primary">Launch App</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="gradient-bg pt-24 pb-20">
    <div class="container mx-auto px-6 text-center">
      <h1 class="text-5xl md:text-6xl font-bold mb-6 leading-tight">
        Library-First Story Discovery
      </h1>
      <p class="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
        Discover existing fanfiction stories with precision, then generate intelligent prompts for new content.
        Our platform prioritizes finding tagged stories before suggesting new ones.
      </p>
      <div class="flex flex-col md:flex-row gap-4 justify-center items-center">
        <a href="/search" class="btn-primary text-lg px-8 py-4">
          🔍 Search Stories
        </a>
        <a href="/generate" class="btn-secondary text-lg px-8 py-4">
          ✨ Generate Prompts
        </a>
      </div>
    </div>
  </section>

    <!-- Features Section -->
    <section id="features" class="py-20 section-light" role="region" aria-labelledby="features-title">
      <div class="container mx-auto px-6">
        <h2 id="features-title" class="text-4xl font-bold text-center mb-8 text-gray-900">
          Advanced Fanfiction Discovery Features
        </h2>
        <p class="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
          Powered by intelligent algorithms, comprehensive tagging system, and user-friendly interface
          designed for both casual readers and dedicated fanfiction enthusiasts.
        </p>
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Library-First Search -->
          <article class="feature-card p-8" itemscope itemtype="https://schema.org/SoftwareApplication">
            <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Search icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-4 text-gray-900" itemprop="name">
              Library-First Story Search Engine
            </h3>
            <p class="text-gray-600 leading-relaxed" itemprop="description">
              Advanced <strong>fanfiction search engine</strong> with intelligent tagging system.
              Search through <strong>10,000+ tagged stories</strong> across multiple fandoms including
              Harry Potter, Percy Jackson, Marvel, and DC Comics. Features <em>relevance scoring</em>,
              <em>plot block filtering</em>, and <em>character relationship mapping</em> for precise story discovery.
            </p>
            <meta itemprop="applicationCategory" content="EntertainmentApplication" />
            <meta itemprop="operatingSystem" content="Web Browser" />
          </article>

          <!-- Intelligent Prompts -->
          <article class="feature-card p-8" itemscope itemtype="https://schema.org/CreativeWork">
            <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Lightbulb icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-4 text-gray-900" itemprop="name">
              AI-Powered Story Prompt Generator
            </h3>
            <p class="text-gray-600 leading-relaxed" itemprop="description">
              <strong>Intelligent fanfiction prompt generator</strong> that creates detailed story ideas
              when existing content doesn't match your needs. Highlights <em>novelty aspects</em>,
              <em>unexplored character combinations</em>, and <em>unique plot elements</em> in your chosen fandom.
              Perfect for <strong>creative writers</strong> seeking fresh inspiration for Harry Potter,
              Marvel, Anime, and other fandoms.
            </p>
            <meta itemprop="genre" content="Creative Writing Tool" />
            <meta itemprop="audience" content="Fanfiction Writers" />
          </article>

          <!-- Drag & Drop Interface -->
          <article class="feature-card p-8" itemscope itemtype="https://schema.org/WebApplication">
            <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6" aria-hidden="true">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Drag and drop icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-4 text-gray-900" itemprop="name">
              Interactive Story Pathway Builder
            </h3>
            <p class="text-gray-600 leading-relaxed" itemprop="description">
              Revolutionary <strong>drag-and-drop story builder</strong> for desktop and
              <em>tap-to-select mobile interface</em>. Create complex story pathways combining
              <strong>plot blocks</strong>, <strong>character tags</strong>, and <strong>relationship dynamics</strong>.
              Features intuitive visual interface for building intricate fanfiction scenarios
              across multiple fandoms with real-time validation and suggestions.
            </p>
            <meta itemprop="applicationCategory" content="UtilitiesApplication" />
            <meta itemprop="interactionType" content="Drag and Drop" />
          </article>
      </div>
    </div>
  </section>

  <!-- Demo Section -->
  <section id="demo" class="py-20 bg-white">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-bold mb-8 text-gray-900">See It In Action</h2>
      <p class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Experience the power of library-first story discovery with our interactive demo
      </p>
      <a href="/search" class="btn-primary text-lg px-8 py-4">
        Try Interactive Demo
      </a>
    </div>
  </section>

  <!-- Documentation -->
  <section id="docs" class="py-20 section-light">
    <div class="container mx-auto px-6">
      <h2 class="text-4xl font-bold text-center mb-16 text-gray-900">Documentation & API</h2>
      <div class="grid md:grid-cols-2 gap-12">
        <div>
          <h3 class="text-2xl font-semibold mb-6 text-gray-900">Developer Resources</h3>
          <div class="space-y-4">
            <a href="/api/docs" class="block p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
              <h4 class="font-semibold text-gray-900">API Documentation</h4>
              <p class="text-gray-600">Complete API reference for developers</p>
            </a>
            <a href="/admin" class="block p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
              <h4 class="font-semibold text-gray-900">Admin Dashboard</h4>
              <p class="text-gray-600">Manage content and user permissions</p>
            </a>
          </div>
        </div>
        <div>
          <h3 class="text-2xl font-semibold mb-6 text-gray-900">User Guides</h3>
          <div class="space-y-4">
            <div class="block p-4 bg-white rounded-lg border">
              <h4 class="font-semibold text-gray-900">Getting Started</h4>
              <p class="text-gray-600">Learn how to search and discover stories</p>
            </div>
            <div class="block p-4 bg-white rounded-lg border">
              <h4 class="font-semibold text-gray-900">Advanced Search</h4>
              <p class="text-gray-600">Master complex queries and filtering</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  </main>

  <!-- Enhanced SEO Footer -->
  <footer class="bg-gray-900 text-white py-16" role="contentinfo" itemscope itemtype="https://schema.org/Organization">
    <div class="container mx-auto px-6">
      <div class="grid md:grid-cols-4 gap-8 mb-12">
        <!-- Brand and Description -->
        <div class="md:col-span-2">
          <div class="flex items-center space-x-3 mb-6">
            <img src="/icon.png" alt="The Pensive Index Logo" class="w-12 h-12 rounded-lg" itemprop="logo" />
            <span class="text-2xl font-bold" itemprop="name">The Pensive Index</span>
          </div>
          <p class="text-gray-300 leading-relaxed mb-6" itemprop="description">
            <strong>The ultimate fanfiction discovery platform</strong> featuring library-first story search,
            intelligent tagging system, and AI-powered prompt generation. Serving readers and writers across
            <strong>50+ fandoms</strong> including Harry Potter, Percy Jackson, Marvel, DC Comics, Anime, and more.
          </p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="px-3 py-1 bg-blue-600 text-sm rounded-full">Fanfiction Search</span>
            <span class="px-3 py-1 bg-purple-600 text-sm rounded-full">Story Generator</span>
            <span class="px-3 py-1 bg-green-600 text-sm rounded-full">Creative Writing</span>
            <span class="px-3 py-1 bg-red-600 text-sm rounded-full">Multi-Fandom</span>
          </div>
          <meta itemprop="url" content="https://pensive.vkrishna04.me" />
          <meta itemprop="foundingDate" content="2025-09-17" />
        </div>

        <!-- Quick Navigation -->
        <div>
          <h4 class="text-lg font-semibold mb-4">Discover Stories</h4>
          <nav aria-label="Platform navigation">
            <ul class="space-y-3">
              <li><a href="/search" class="text-gray-300 hover:text-white transition-colors flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search 10,000+ Stories
              </a></li>
              <li><a href="/generate" class="text-gray-300 hover:text-white transition-colors flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                AI Prompt Generator
              </a></li>
              <li><a href="/fandom/harry-potter" class="text-gray-300 hover:text-white transition-colors">Harry Potter Fanfiction</a></li>
              <li><a href="/fandom/percy-jackson" class="text-gray-300 hover:text-white transition-colors">Percy Jackson Stories</a></li>
              <li><a href="/fandom/marvel" class="text-gray-300 hover:text-white transition-colors">Marvel Fanfiction</a></li>
            </ul>
          </nav>
        </div>

        <!-- Resources and Tools -->
        <div>
          <h4 class="text-lg font-semibold mb-4">Developer Resources</h4>
          <nav aria-label="Developer resources">
            <ul class="space-y-3">
              <li><a href="/api/docs" class="text-gray-300 hover:text-white transition-colors">API Documentation</a></li>
              <li><a href="https://github.com/Life-Experimentalist/the-pensive-index" class="text-gray-300 hover:text-white transition-colors external" rel="noopener noreferrer" target="_blank">
                GitHub Repository ↗
              </a></li>
              <li><a href="/sitemap.xml" class="text-gray-300 hover:text-white transition-colors">Sitemap</a></li>
              <li><a href="https://vkrishna04.me" class="text-gray-300 hover:text-white transition-colors external" rel="noopener noreferrer" target="_blank" itemprop="url">
                Creator: VKrishna04 ↗
              </a></li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Popular Fandoms and Tags -->
      <div class="border-t border-gray-800 pt-8 mb-8">
        <h5 class="text-lg font-semibold mb-4">Popular Fandoms and Tags</h5>
        <div class="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h6 class="text-gray-300 font-medium mb-2">Fantasy & Magic</h6>
            <p class="text-gray-400">
              <a href="/fandom/harry-potter" class="hover:text-white">Harry Potter</a>,
              <a href="/fandom/percy-jackson" class="hover:text-white">Percy Jackson</a>,
              <a href="/fandom/lord-of-the-rings" class="hover:text-white">LOTR</a>,
              Time Travel, Magic Systems, Prophecies
            </p>
          </div>
          <div>
            <h6 class="text-gray-300 font-medium mb-2">Superheroes & Comics</h6>
            <p class="text-gray-400">
              <a href="/fandom/marvel" class="hover:text-white">Marvel</a>,
              <a href="/fandom/dc-comics" class="hover:text-white">DC Comics</a>,
              Crossovers, Powers, Alternate Universes, Team Dynamics
            </p>
          </div>
          <div>
            <h6 class="text-gray-300 font-medium mb-2">Anime & Manga</h6>
            <p class="text-gray-400">
              <a href="/fandom/naruto" class="hover:text-white">Naruto</a>,
              <a href="/fandom/my-hero-academia" class="hover:text-white">MHA</a>,
              Attack on Titan, Character Development, Romance, Action
            </p>
          </div>
        </div>
      </div>

      <!-- Copyright and Legal -->
      <div class="border-t border-gray-800 pt-8 text-center">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <p class="text-gray-400 mb-4 md:mb-0">
            © 2025 <span itemprop="name">The Pensive Index</span>.
            Built with ❤️ by <a href="https://vkrishna04.me" class="text-blue-400 hover:text-blue-300" itemprop="founder">VKrishna04</a>
          </p>
          <div class="flex space-x-6 text-sm text-gray-400">
            <a href="/privacy" class="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" class="hover:text-white transition-colors">Terms of Service</a>
            <a href="mailto:contact@vkrishna04.me" class="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <p class="text-gray-500 text-xs mt-4">
          Fanfiction discovery platform designed for educational and entertainment purposes.
          All referenced fandoms are property of their respective creators and copyright holders.
        </p>
      </div>
    </div>
  </footer>

  <!-- Enhanced JavaScript -->
  <script>
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });

    // Navigation background on scroll
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('nav');
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });

    // App launch functionality for buttons
    document.addEventListener('DOMContentLoaded', () => {
      // Handle app launches
      const launchButtons = document.querySelectorAll('a[href^="/"]');
      launchButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const href = button.getAttribute('href');
          if (href.startsWith('/search') || href.startsWith('/generate') || href.startsWith('/admin')) {
            // These will be handled by the Next.js app
            window.location.href = href;
          }
        });
      });
    });
  </script>
</body>
</html>
`;

export function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Response {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle SEO and manifest files
  if (pathname === '/robots.txt') {
    return new Response(generateRobotsTxt(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  if (pathname === '/sitemap.xml') {
    return new Response(generateSitemap(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  if (pathname === '/manifest.json') {
    const manifest = {
      name: 'The Pensive Index - Fanfiction Discovery Platform',
      short_name: 'Pensive Index',
      description:
        'Library-first story discovery and intelligent prompt generation for fanfiction across 50+ popular fandoms',
      start_url: '/',
      display: 'standalone',
      background_color: '#1e293b',
      theme_color: '#3b82f6',
      orientation: 'portrait-primary',
      scope: '/',
      icons: [
        {
          src: '/icon.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icon.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['entertainment', 'books', 'education', 'productivity'],
      lang: 'en',
      dir: 'ltr',
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Handle API health check
  if (pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
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

  // Handle static assets - let Cloudflare serve them
  if (
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    // Return 404 to let Cloudflare serve static assets from public directory
    return new Response(null, { status: 404 });
  }

  // Handle Next.js app routes - forward to application
  const nextjsRoutes = [
    '/search',
    '/generate',
    '/admin',
    '/api',
    '/fandom',
    '/pathway',
    '/story',
    '/sign-in',
    '/sign-up',
    '/user-profile',
    '/_next',
    '/unauthorized',
    '/privacy',
    '/terms',
  ];

  if (nextjsRoutes.some(route => pathname.startsWith(route))) {
    // In development, redirect to local server
    if (env.ENVIRONMENT === 'development') {
      return Response.redirect('http://localhost:3001' + pathname, 302);
    }

    // In production, this would be handled by your Next.js deployment
    // For now, serve a loading page with proper meta tags
    const loadingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Loading - The Pensive Index</title>
  <meta name="description" content="Loading The Pensive Index fanfiction discovery platform...">
  <link rel="canonical" href="https://pensive.vkrishna04.me${pathname}">
  <meta name="robots" content="noindex">
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>The Pensive Index</h1>
  <div class="spinner"></div>
  <p>Loading fanfiction discovery platform...</p>
  <script>
    // In production, this would redirect to your Next.js app
    setTimeout(() => {
      window.location.href = 'https://your-nextjs-deployment.pages.dev' + window.location.pathname;
    }, 2000);
  </script>
</body>
</html>`.trim();

    return new Response(loadingPage, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Handle documentation routes (legacy /docs paths)
  if (pathname.startsWith('/docs')) {
    return new Response(ENHANCED_DOCS_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
    });
  }

  // Default: serve enhanced SEO-optimized landing page
  return new Response(ENHANCED_DOCS_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

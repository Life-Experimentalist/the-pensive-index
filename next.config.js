/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages deployment configuration
  // output: 'export', // Disabled for Cloudflare Pages with edge functions

  // Configure for Cloudflare deployment
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',

  // Enable trailing slash for proper routing
  trailingSlash: true,

  // Skip ESLint during build - run separately in CI/CD
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript checking during build - run separately in CI/CD
  typescript: {
    ignoreBuildErrors: true, // Type check runs separately for faster builds
  },

  // Optimize images for Cloudflare
  images: {
    unoptimized: false, // Let Cloudflare handle optimization
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Optimize bundle size and performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Aggressive bundle splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework bundle (React, Next.js)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Large libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `npm.${packageName?.replace('@', '')}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common shared modules
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Minimize bundle size
      config.optimization.minimize = true;
    }

    // Faster builds in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
    }

    return config;
  },

  // Enable compression
  compress: true,

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  reactStrictMode: true,

  // Experimental features for faster builds
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    optimizePackageImports: ['@heroicons/react', 'lucide-react', 'date-fns'], // Tree-shake large packages
    turbo: {
      // Turbopack configuration (when enabled)
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
  },

  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */

// Import speed-measure-webpack-plugin if available (install with: npm install speed-measure-webpack-plugin --save-dev)
let SpeedMeasurePlugin;
try {
  SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
} catch (e) {
  // Plugin not installed, skip
  console.log(
    '📊 speed-measure-webpack-plugin not found. Install it with: npm install speed-measure-webpack-plugin --save-dev'
  );
}

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/v1/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/v1/image/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/v1/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/v1/image/**',
      },
    ],
  },

  // Optimize bundle size and performance
  webpack: (config, { dev, isServer }) => {
    // Wrap config with SpeedMeasurePlugin if available and in production mode
    let smp;
    if (SpeedMeasurePlugin && !dev && process.env.MEASURE_BUILD === 'true') {
      smp = new SpeedMeasurePlugin({
        outputFormat: 'human',
        outputTarget: '.docs/build-performance.txt',
      });
      console.log(
        '📊 Speed measurements enabled. Results will be saved to build-performance.txt'
      );
    }

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

    // Return wrapped config if speed measurement is enabled
    return smp ? smp.wrap(config) : config;
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
  },

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },

  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;

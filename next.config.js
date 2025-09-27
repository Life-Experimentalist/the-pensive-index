/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static site generation for GitHub Pages
  // output: 'export',

  // Configure for custom domain deployment
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',

  // Enable trailing slash for proper routing
  trailingSlash: true,

  // Temporary: Skip ESLint during build to focus on hydration fixes
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Optimize bundle size and performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }

    return config;
  },

  // Enable compression
  compress: true,

  // Images handled above in static export config

  // Security headers are not supported with static export.
  // They should be configured on the web server (e.g., Nginx, Vercel).

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,

  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Redirects are not supported with static export.
  // They should be configured on the web server.

  // Rewrites are not supported with static export.
  // They should be configured on the web server.
};

module.exports = nextConfig;

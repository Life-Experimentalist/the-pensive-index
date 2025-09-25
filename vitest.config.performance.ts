import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'admin-performance',
    environment: 'jsdom',
    include: ['tests/performance/**/*.test.{ts,tsx}'],
    exclude: ['tests/integration/**', 'tests/admin/**', 'tests/validation/**'],
    setupFiles: ['tests/setup/performance-setup.ts'],
    testTimeout: 30000, // Longer timeout for performance tests
    hookTimeout: 10000,
    reporters: ['verbose', 'json'],
    outputFile: 'performance-results.json',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for consistent performance measurements
      },
    },
    globals: true,
    logHeapUsage: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'validation-engine',
    include: [
      'tests/validation/**/*.test.ts',
      'tests/performance/**/*.test.ts',
      'tests/integration/validation-*.test.ts',
    ],
    environment: 'node',
    setupFiles: ['./tests/setup/validation-setup.ts'],
    testTimeout: 5000,
    hookTimeout: 3000,
    // Performance testing configuration
    benchmark: {
      include: ['tests/performance/**/*.bench.ts'],
      exclude: ['node_modules', 'dist'],
    },
    // Custom matchers for performance assertions
    globals: true,
    // Reporter configuration for performance tracking
    reporters: [
      'default',
      ['json', { outputFile: 'test-results/validation-results.json' }],
      ['junit', { outputFile: 'test-results/validation-junit.xml' }],
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/validation/**/*.ts',
        'src/lib/database/queries/validation-*.ts',
      ],
      exclude: [
        'src/lib/validation/**/*.test.ts',
        'src/lib/validation/**/*.bench.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/tests': resolve(__dirname, './tests'),
    },
  },
  define: {
    // Performance testing constants
    'process.env.PERFORMANCE_TARGET_MS': '100',
    'process.env.VALIDATION_TIMEOUT_MS': '200',
    'process.env.NODE_ENV': '"test"',
  },
});

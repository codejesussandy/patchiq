import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/unit/setup.ts',
    css: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'e2e',
      'tests/e2e',
      'tests/integration',
      'playwright.config.ts',
      '**/*.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'e2e/',
        'dist/',
        'tests/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/',
        '**/__tests__/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/main.tsx',
        'playwright.config.ts',
      ],
      include: ['src/**/*.{ts,tsx}'],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});

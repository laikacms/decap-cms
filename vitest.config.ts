import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle CJS packages that are transitively imported via workspace
    // package aliases. Without this, Vite's lazy dep optimizer encounters them
    // mid-module-graph and deadlocks waiting for optimization to complete.
    include: [
      'js-sha256',
      'lodash',
      'lodash/fp',
      'node-fetch',
      'nock',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.nx/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test/**',
      ],
    },
  },
  resolve: {
    alias: [
      // More specific subpath aliases must come before the package root alias.
      {
        find: /^decap-cms-lib-util\/types\/cms$/,
        replacement: path.resolve(__dirname, 'packages/decap-cms-lib-util/src/types/cms/index.ts'),
      },
      {
        find: /^decap-cms-lib-util\/types\/cms\/(.*)$/,
        replacement: path.resolve(__dirname, 'packages/decap-cms-lib-util/src/types/cms') + '/$1',
      },
      { find: 'decap-cms-lib-auth', replacement: path.resolve(__dirname, 'packages/decap-cms-lib-auth/src/index.ts') },
      { find: 'decap-cms-lib-util', replacement: path.resolve(__dirname, 'packages/decap-cms-lib-util/src/index.ts') },
      { find: 'decap-cms-ui-default', replacement: path.resolve(__dirname, 'packages/decap-cms-ui-default/src/index.ts') },
      { find: 'decap-cms-backend-github', replacement: path.resolve(__dirname, 'packages/decap-cms-backend-github/src/index.ts') },
      { find: 'decap-cms-lib-widgets', replacement: path.resolve(__dirname, 'packages/decap-cms-lib-widgets/src/index.ts') },
      { find: 'decap-cms-widget-object', replacement: path.resolve(__dirname, 'packages/decap-cms-widget-object/src/index.ts') },
      { find: 'path', replacement: 'path-browserify' },
    ],
  },
});

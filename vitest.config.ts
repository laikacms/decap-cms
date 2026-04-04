import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    alias: {
      'decap-cms-lib-auth': path.resolve(__dirname, 'packages/decap-cms-lib-auth/src/index.ts'),
      'decap-cms-lib-util': path.resolve(__dirname, 'packages/decap-cms-lib-util/src/index.ts'),
      'decap-cms-ui-default': path.resolve(__dirname, 'packages/decap-cms-ui-default/src/index.ts'),
      'decap-cms-backend-github': path.resolve(__dirname, 'packages/decap-cms-backend-github/src/index.ts'),
      'decap-cms-lib-widgets': path.resolve(__dirname, 'packages/decap-cms-lib-widgets/src/index.ts'),
      'decap-cms-widget-object': path.resolve(__dirname, 'packages/decap-cms-widget-object/src/index.ts'),
      path: 'path-browserify',
    },
  },
});

import { defineConfig } from 'vite';

/**
 * Minimal Vite configuration for Cypress test file preprocessing.
 * This is intentionally simple - cypress test files don't need the full
 * UMD build config from vite.config.demo.ts.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Node.js polyfills for browser
      path: 'path-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env': '{}',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
});

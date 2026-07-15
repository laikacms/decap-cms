import { defineConfig } from 'vite';
import path from 'path';

/**
 * Minimal Vite configuration for Cypress test file preprocessing.
 * This is intentionally simple - cypress test files don't need the full
 * UMD build config from vite.config.demo.ts.
 */
export default defineConfig({
  resolve: {
    alias: [
      // `@/*` -> `src/*` (mirrors tsconfig `paths`).
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
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

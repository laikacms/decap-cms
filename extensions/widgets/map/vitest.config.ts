import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// No `@/` alias and no alias back into `decap-cms`'s `src/`: this
// package resolves the CMS through its published `exports` map, exactly as a
// third-party extension would. That means the core package must be built
// (`pnpm --filter decap-cms build`) before these tests can run.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

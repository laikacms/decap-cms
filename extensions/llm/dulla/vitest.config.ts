import { defineConfig } from 'vitest/config';

// No `@/` alias and no alias back into `@laikacms/decap-cms`'s `src/`: this
// package resolves the CMS through its published `exports` map, exactly as a
// third-party extension would. That means the core package must be built
// (`pnpm --filter @laikacms/decap-cms build`) before these tests can run.
//
// No jsdom: Dulla is a transport, not UI, and `createDullaTransport` imports
// nothing from the CMS but types. It needs `fetch` and `structuredClone`, both
// of which node supplies. (`registerDulla` does touch the CMS registry, which
// is why it lives in its own module rather than in this import graph.)
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

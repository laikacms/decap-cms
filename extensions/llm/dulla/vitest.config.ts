import { defineConfig } from 'vitest/config';

// No `@/` alias and no alias back into `@laikacms/decap-cms`'s `src/`: this
// package resolves the CMS through its published `exports` map, exactly as a
// third-party extension would. That means the core package must be built
// (`pnpm --filter @laikacms/decap-cms build`) before these tests can run.
//
// No jsdom by default: Dulla is a transport, not UI, and `createDullaTransport`
// imports nothing from the CMS but types. It needs `fetch` and
// `structuredClone`, both of which node supplies. `registerDulla` does touch
// the CMS registry though, and importing `@laikacms/decap-cms/core` eagerly
// pulls in browser-only code (e.g. `AssetProxy`); its spec opts into jsdom
// per-file via a `// @vitest-environment jsdom` docblock instead of paying
// for jsdom on every file in this package.
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

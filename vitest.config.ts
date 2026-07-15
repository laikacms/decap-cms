import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// @vitejs/plugin-react v6 no longer supports the babel option (uses OXC/rolldown).
// Without @emotion/babel-plugin, styled components have targetClassName=undefined, and
// the development build of @emotion/styled/base returns 'NO_COMPONENT_SELECTOR' from
// toString(), which causes @emotion/serialize to throw when component selectors like
// ${Icon} are used in styled templates. The fix: inline @emotion/styled so Vite processes
// it through the plugin pipeline, then patch isDevelopment=false so toString() returns
// ".undefined" (which doesn't throw; the selector just won't match anything in tests).
const emotionProductionPlugin = {
  name: 'emotion-styled-base-production',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.includes('emotion-styled-base') && id.includes('.development.')) {
      return code.replace('var isDevelopment = true;', 'var isDevelopment = false;');
    }
  },
};

// Since the monorepo flattening (single @laikacms/decap-cms package), @emotion/react +
// @emotion/styled live in the root node_modules. The pre-flatten paths previously
// pointed under `packages/decap-cms-core/node_modules/@emotion/*`.
const EMOTION_REACT = path.resolve(__dirname, 'node_modules/@emotion/react');
const EMOTION_STYLED = path.resolve(__dirname, 'node_modules/@emotion/styled');

export default defineConfig({
  plugins: [
    emotionProductionPlugin,
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
  optimizeDeps: {
    // Pre-bundle CJS packages that are transitively imported via workspace
    // package aliases. Without this, Vite's lazy dep optimizer encounters them
    // mid-module-graph and deadlocks waiting for optimization to complete.
    include: [
      'node-fetch',
      'nock',
    ],
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.nx/**'],
    server: {
      deps: {
        // Inline @emotion/styled so Vite's transform pipeline processes it (instead of
        // externalizing to Node directly), enabling the emotionProductionPlugin above.
        inline: [/@emotion\/styled/],
      },
    },
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
      // `@/*` -> `src/*` (mirrors tsconfig `paths`). Regex form so it never
      // matches scoped packages like `@emotion/react`. Listed first so it wins.
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
      // Cross-package imports were rewritten to relative paths in the single-package
      // restructure, so the former `decap-cms-*` → `packages/decap-cms-*/src` aliases
      // are gone. Only the path shim and emotion anchoring remain.
      // Anchor emotion packages to concrete paths so packages without @emotion/* as
      // a direct dependency can still resolve them (pnpm strict isolation prevents
      // hoisting them to the workspace root node_modules).
      { find: /^@emotion\/react/, replacement: EMOTION_REACT },
      { find: /^@emotion\/styled/, replacement: EMOTION_STYLED },
    ],
  },
});

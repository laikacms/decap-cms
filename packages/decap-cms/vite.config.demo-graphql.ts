import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

/**
 * Vite config for building the IIFE bundle that dev-test/index.html loads
 * via <script src="dist/decap-cms-graphql.js"> — the classic bundle plus the opt-in GraphQL backend registrations (see dev-test/graphql-demo-entry.ts).
 */
export default defineConfig({
  plugins: [
    react(),
    // ANALYZE=1 → interactive treemap next to the bundle.
    ...(process.env.ANALYZE
      ? [
          visualizer({
            emitFile: true,
            filename: 'bundle-report-decap-cms-graphql.html',
            gzipSize: true,
          }),
        ]
      : []),
  ],
  build: {
    outDir: 'dev-test/dist',
    // Don't empty the dir on (re)build: emptyOutDir deletes decap-cms.js for the
    // duration of a build, which 404s the dev server during `pnpm dev`, and it
    // would also wipe the sibling laika-cms*.js bundles in the same dir.
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'dev-test/graphql-demo-entry.ts'),
      name: 'DecapCms',
      fileName: () => 'decap-cms-graphql.js',
      // Distinct CSS name so it doesn't collide with the laika bundles' CSS in
      // the shared `dev-test/dist` outDir (Vite otherwise derives `decap.css`
      // from the package name for every lib build).
      cssFileName: 'decap-cms-graphql',
      formats: ['iife'],
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // The entry has both named exports (`init`, `h`, …) and a default; tell
      // Rollup to emit named exports (default is available as `.default`).
      output: { exports: 'named' },
    },
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
  define: {
    // Lib-mode builds preserve `process.env.NODE_ENV` for downstream bundlers,
    // but this IIFE loads straight in a browser where `process` is undefined,
    // so it must be statically replaced. Production React is also what the
    // consume-once replay e2e fixtures require: StrictMode's dev-only
    // double-invoked effects would desync them (playwright/backends/replay.ts).
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for building the IIFE bundle that dev-test/index.html loads
 * via <script src="dist/decap-cms.js">.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dev-test/dist',
    // Don't empty the dir on (re)build: emptyOutDir deletes decap-cms.js for the
    // duration of a build, which 404s the dev server during `pnpm dev`, and it
    // would also wipe the sibling laika-cms*.js bundles in the same dir.
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/app/index.ts'),
      name: 'DecapCms',
      fileName: () => 'decap-cms.js',
      // Distinct CSS name so it doesn't collide with the laika bundles' CSS in
      // the shared `dev-test/dist` outDir (Vite otherwise derives `decap.css`
      // from the package name for every lib build).
      cssFileName: 'decap-cms',
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
      { find: 'path', replacement: 'path-browserify' },
      { find: 'buffer', replacement: 'buffer' },
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env': '{}',
    global: 'globalThis',
    DECAP_CMS_APP_VERSION: JSON.stringify('dev'),
    DECAP_CMS_CORE_VERSION: JSON.stringify('dev'),
    DECAP_CMS_VERSION: JSON.stringify('dev'),
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
});

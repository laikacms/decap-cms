import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for building the laika-cms-app IIFE bundle. Mirrors
 * `vite.config.demo.ts` but compiles `src/laika-app/index.ts` so consumers
 * can drop `dev-test/dist/laika-cms.js` into an HTML page exactly like the
 * default decap-cms.js bundle.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dev-test/dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/laika-app/index.ts'),
      name: 'LaikaCms',
      fileName: () => 'laika-cms.js',
      // Distinct CSS name so it doesn't collide with the other bundles' CSS in
      // the shared `dev-test/dist` outDir (Vite otherwise derives `decap.css`
      // from the package name for every lib build).
      cssFileName: 'laika-cms',
      formats: ['iife'],
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // The entry has both named exports and a default; emit named exports
      // (default remains available as `.default`).
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

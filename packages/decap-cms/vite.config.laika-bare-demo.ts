import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

/**
 * IIFE build for `@laikacms/decap-cms/laika-app/bare` — the laika shell + UI
 * primitives + providers + init(), WITHOUT the eager extension registrations
 * (no backends, widgets, editor components, locales). Consumers using the
 * bare entry register only what they need.
 *
 * This config exists primarily to demonstrate that the bare entry produces
 * a measurably smaller bundle vs `vite.config.laika-demo.ts`.
 */
export default defineConfig({
  plugins: [
    react(),
    // ANALYZE=1 (pnpm analyze:demo) → interactive treemap next to the bundle.
    ...(process.env.ANALYZE
      ? [
        visualizer({
          emitFile: true,
          filename: 'bundle-report-laika-cms-bare.html',
          gzipSize: true,
        }),
      ]
      : []),
  ],
  build: {
    outDir: 'dev-test/dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/laika-app/bare.ts'),
      name: 'LaikaCmsBare',
      fileName: () => 'laika-cms-bare.js',
      // Distinct CSS name so it doesn't collide with the other bundles' CSS in
      // the shared `dev-test/dist` outDir (Vite otherwise derives `decap.css`
      // from the package name for every lib build).
      cssFileName: 'laika-cms-bare',
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
    ],
  },
  define: {
    // Lib-mode builds preserve `process.env.NODE_ENV` for downstream bundlers,
    // but this IIFE loads straight in a browser where `process` is undefined,
    // so it must be statically replaced.
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
});

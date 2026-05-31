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
    lib: {
      entry: path.resolve(__dirname, 'src/app/index.ts'),
      name: 'DecapCms',
      fileName: () => 'decap-cms.js',
      formats: ['iife'],
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      path: 'path-browserify',
      buffer: 'buffer',
    },
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

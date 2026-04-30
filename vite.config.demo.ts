import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite configuration for building the bundled CMS for E2E tests.
 * This creates a UMD bundle that can be loaded via script tag in dev-test/index.html
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dev-test/dist',
    lib: {
      entry: path.resolve(__dirname, 'packages/decap-cms-app/src/index.ts'),
      name: 'DecapCms',
      fileName: () => 'decap-cms.js',
      formats: ['iife'],
    },
    rolldownOptions: {
      output: {
      }
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      // Alias workspace packages to their source
      'decap-cms-app': path.resolve(__dirname, 'packages/decap-cms-app/src'),
      'decap-cms-core': path.resolve(__dirname, 'packages/decap-cms-core/src'),
      'decap-cms-lib-auth': path.resolve(__dirname, 'packages/decap-cms-lib-auth/src'),
      'decap-cms-lib-util': path.resolve(__dirname, 'packages/decap-cms-lib-util/src'),
      'decap-cms-lib-widgets': path.resolve(__dirname, 'packages/decap-cms-lib-widgets/src'),
      'decap-cms-ui-default': path.resolve(__dirname, 'packages/decap-cms-ui-default/src'),
      'decap-cms-ui-auth': path.resolve(__dirname, 'packages/decap-cms-ui-auth/src'),
      'decap-cms-backend-aws-cognito-github-proxy': path.resolve(__dirname, 'packages/decap-cms-backend-aws-cognito-github-proxy/src'),
      'decap-cms-backend-azure': path.resolve(__dirname, 'packages/decap-cms-backend-azure/src'),
      'decap-cms-backend-bitbucket': path.resolve(__dirname, 'packages/decap-cms-backend-bitbucket/src'),
      'decap-cms-backend-git-gateway': path.resolve(__dirname, 'packages/decap-cms-backend-git-gateway/src'),
      'decap-cms-backend-gitea': path.resolve(__dirname, 'packages/decap-cms-backend-gitea/src'),
      'decap-cms-backend-github': path.resolve(__dirname, 'packages/decap-cms-backend-github/src'),
      'decap-cms-backend-gitlab': path.resolve(__dirname, 'packages/decap-cms-backend-gitlab/src'),
      'decap-cms-backend-proxy': path.resolve(__dirname, 'packages/decap-cms-backend-proxy/src'),
      'decap-cms-backend-test': path.resolve(__dirname, 'packages/decap-cms-backend-test/src'),
      'decap-cms-default-exports': path.resolve(__dirname, 'packages/decap-cms-default-exports/src'),
      'decap-cms-editor-component-image': path.resolve(__dirname, 'packages/decap-cms-editor-component-image/src'),
      'decap-cms-locales': path.resolve(__dirname, 'packages/decap-cms-locales/src'),
      'decap-cms-media-library-cloudinary': path.resolve(__dirname, 'packages/decap-cms-media-library-cloudinary/src'),
      'decap-cms-media-library-uploadcare': path.resolve(__dirname, 'packages/decap-cms-media-library-uploadcare/src'),
      'decap-cms-widget-boolean': path.resolve(__dirname, 'packages/decap-cms-widget-boolean/src'),
      'decap-cms-widget-code': path.resolve(__dirname, 'packages/decap-cms-widget-code/src'),
      'decap-cms-widget-colorstring': path.resolve(__dirname, 'packages/decap-cms-widget-colorstring/src'),
      'decap-cms-widget-datetime': path.resolve(__dirname, 'packages/decap-cms-widget-datetime/src'),
      'decap-cms-widget-file': path.resolve(__dirname, 'packages/decap-cms-widget-file/src'),
      'decap-cms-widget-image': path.resolve(__dirname, 'packages/decap-cms-widget-image/src'),
      'decap-cms-widget-list': path.resolve(__dirname, 'packages/decap-cms-widget-list/src'),
      'decap-cms-widget-map': path.resolve(__dirname, 'packages/decap-cms-widget-map/src'),
      'decap-cms-widget-markdown': path.resolve(__dirname, 'packages/decap-cms-widget-markdown/src'),
      'decap-cms-widget-number': path.resolve(__dirname, 'packages/decap-cms-widget-number/src'),
      'decap-cms-widget-object': path.resolve(__dirname, 'packages/decap-cms-widget-object/src'),
      'decap-cms-widget-relation': path.resolve(__dirname, 'packages/decap-cms-widget-relation/src'),
      'decap-cms-widget-richtext': path.resolve(__dirname, 'packages/decap-cms-widget-richtext/src'),
      'decap-cms-widget-select': path.resolve(__dirname, 'packages/decap-cms-widget-select/src'),
      'decap-cms-widget-string': path.resolve(__dirname, 'packages/decap-cms-widget-string/src'),
      'decap-cms-widget-text': path.resolve(__dirname, 'packages/decap-cms-widget-text/src'),
      // Node.js polyfills for browser
      path: 'path-browserify',
      stream: 'stream-browserify',
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

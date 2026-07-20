import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
  ],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.nx/**'],
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
    ],
  },
});

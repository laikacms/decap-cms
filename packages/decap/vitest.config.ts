import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const decapCmsSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../decap-cms/src');

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    // Mirrors tsconfig `paths`: `decap dev` runs the decap-cms dev server from
    // source, whose files use their package's `@/` alias.
    alias: [
      { find: /^decap-cms\/dev-server$/, replacement: path.join(decapCmsSrc, 'dev-server/index.ts') },
      { find: /^@\//, replacement: decapCmsSrc + '/' },
    ],
  },
});

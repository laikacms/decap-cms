import { defineConfig } from 'tsup';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Auto-discover entries: one per src/<name>/index.{ts,tsx}.
// See RESTRUCTURE.md for why this layout exists.
const SRC = 'src';
const entries: Record<string, string> = {};
for (const name of readdirSync(SRC)) {
  const dir = join(SRC, name);
  if (!statSync(dir).isDirectory()) continue;
  const tsx = join(dir, 'index.tsx');
  const ts = join(dir, 'index.ts');
  const entry = existsSync(tsx) ? tsx : existsSync(ts) ? ts : null;
  if (entry) entries[name] = entry;
}

export default defineConfig({
  entry: entries,
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  target: 'es2022',
  external: [
    'react',
    'react-dom',
    '@emotion/react',
    '@emotion/styled',
  ],
});

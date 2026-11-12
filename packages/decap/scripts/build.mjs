// Builds the `decap` binary into dist/ with esbuild.
//
// Bundled, like upstream's webpack build, because the dev server comes from
// the decap-cms source: decap-cms's own dist/ is emitted for bundlers
// (extensionless relative imports, `@/` rewritten by tsc-alias) and does not
// load in plain Node. esbuild resolves `decap-cms/dev-server` through this
// package's tsconfig `paths` and the decap-cms files' `@/` alias through
// theirs, so building needs no prior decap-cms build.
//
// The packages in `dependencies` stay external and are installed with the
// CLI; everything else (the API contract, the dev server and the few
// decap-cms helpers it uses) is bundled. Code splitting keeps the dev server
// and its imports (simple-git, dotenv) out of the chunk the other commands
// load.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).flatMap(name => [name, `${name}/*`]);
const outdir = path.join(root, 'dist');

fs.rmSync(outdir, { recursive: true, force: true });

await build({
  absWorkingDir: root,
  entryPoints: { decap: 'src/index.ts' },
  outdir,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  chunkNames: 'chunks/[name]-[hash]',
  tsconfig: 'tsconfig.json',
  external,
  define: { DECAP_CLI_VERSION: JSON.stringify(pkg.version) },
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'warning',
});

fs.chmodSync(path.join(outdir, 'decap.js'), 0o755);
console.log(`Built ${path.relative(process.cwd(), path.join(outdir, 'decap.js'))} (${pkg.name}@${pkg.version})`);

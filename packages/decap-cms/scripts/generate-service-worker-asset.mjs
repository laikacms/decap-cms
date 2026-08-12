// Emits the app-shell caching service worker (DCMS-1993) as a real static
// `.js` file at each path given on the command line.
//
// `src/core/serviceWorker/appShellServiceWorker.ts` keeps the SW source as a
// single exported string (`APP_SHELL_SERVICE_WORKER_SOURCE`) — the source of
// truth used both by this script (to produce the on-disk asset a browser can
// actually fetch and register) and, historically, by an in-page `Blob`. That
// `Blob`-URL registration was rejected by every browser's Service Worker spec
// implementation (`blob:` script URLs aren't supported — DCMS-2002); the fix
// is to serve this same source from a real same-origin URL instead, which is
// what this script produces at build time.
//
// Usage: node ./scripts/generate-service-worker-asset.mjs <outFile> [<outFile> ...]
// Run after the TS/bundle build steps that produce the directories the given
// paths live in (see `build` and `build:dev-test` in package.json).

import esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceFile = fileURLToPath(
  new URL('../src/core/serviceWorker/appShellServiceWorker.ts', import.meta.url),
);

const outFiles = process.argv.slice(2);
if (outFiles.length === 0) {
  console.error('usage: generate-service-worker-asset.mjs <outFile> [<outFile> ...]');
  process.exit(1);
}

const { outputFiles } = esbuild.buildSync({
  entryPoints: [sourceFile],
  bundle: false,
  write: false,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
});

const compiledModule = { exports: {} };
new Function('module', 'exports', outputFiles[0].text)(compiledModule, compiledModule.exports);

const swSource = compiledModule.exports.APP_SHELL_SERVICE_WORKER_SOURCE;
if (typeof swSource !== 'string' || swSource.trim().length === 0) {
  console.error('[generate-service-worker-asset] APP_SHELL_SERVICE_WORKER_SOURCE was empty/missing');
  process.exit(1);
}

for (const outFile of outFiles) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, swSource);
  console.log(`[generate-service-worker-asset] wrote ${outFile}`);
}

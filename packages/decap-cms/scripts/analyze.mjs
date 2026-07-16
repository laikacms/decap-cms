// `pnpm analyze`: measure the bundle size a consumer would ship and record it
// in `.github/bundle-size.json` (committed, NOT gitignored, not in dist/).
// Standalone command; run `pnpm build` first so dist/ is fresh.
//
// `pnpm analyze --explore` additionally renders an interactive treemap per entry
// point (esbuild metafile -> esbuild-visualizer via npx, no dependency added)
// into .temp/ (gitignored) and opens them in the browser.
//
// The library itself is compiled with plain `tsc` (no bundling), so "bundle size"
// here means: bundle each public entry point from `dist/` with esbuild the way a
// consumer's bundler would - dependencies inlined, peerDependencies external -
// then minify and gzip.
//
// Also records `install`: the on-disk size of the production dependency tree
// (transitive `dependencies`, deduped by real path), i.e. what `pnpm install`
// of this package costs a consumer in node_modules. Dev deps and peer deps are
// not counted (the consumer supplies peers).
//
// The artifact doubles as a shields.io *endpoint* badge
// (https://shields.io/badges/endpoint-badge): the top-level `schemaVersion`,
// `label`, `message` and `color` fields follow that schema, and extra fields
// (`entries`, `install`) are ignored by shields. Additional badges can query the
// extra fields via shields' dynamic-json badge, e.g.
//   https://img.shields.io/badge/dynamic/json?url=<raw-url>&query=$.install.pretty&label=install%20size
// No timestamp on purpose: the file only changes when sizes change.

import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const explore = process.argv.includes('--explore');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Peer deps are the consumer's problem; everything else ships with us. Node
// built-ins (a few runtime-guarded fallbacks import 'path'/'crypto') get
// stubbed out by consumer bundlers like Vite, so they count as zero bytes.
const external = [
  ...Object.keys(pkg.peerDependencies).flatMap(dep => [dep, `${dep}/*`]),
  ...builtinModules.flatMap(mod => [mod, `node:${mod}`]),
];

// Headline entry points. "." (the classic app bootstrap, pulls in nearly
// everything) drives the badge; add entries here to track more subpaths.
const entries = [
  { subpath: '.', slug: 'app', entry: 'dist/app/index.js' },
  { subpath: './laika-app', slug: 'laika-app', entry: 'dist/laika-app/index.js' },
  { subpath: './laika-app/bare', slug: 'laika-app-bare', entry: 'dist/laika-app/bare.js' },
];

function pretty(bytes) {
  if (bytes >= 10_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  return `${Math.round(bytes / 1000)} kB`;
}

// Node-style resolution, but only to locate a package's directory: walk up from
// `fromDir` looking for `node_modules/<name>/package.json`. Realpath so pnpm's
// symlink layout dedupes to the store copy.
function resolvePkgDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Bytes on disk, not following symlinks (they point at other packages, which
// are counted once via their own real path).
function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(path);
    else if (entry.isFile()) total += lstatSync(path).size;
  }
  return total;
}

// Size of the production install: transitive `dependencies` (plus resolvable
// `optionalDependencies`), deduped by real path. Peer deps excluded.
function measureInstall() {
  const seen = new Set();
  let bytes = 0;
  const queue = Object.keys(pkg.dependencies).map(name => ({ name, fromDir: root }));
  while (queue.length > 0) {
    const { name, fromDir } = queue.pop();
    const dir = resolvePkgDir(name, fromDir);
    if (dir === null || seen.has(dir)) continue;
    seen.add(dir);
    bytes += dirSize(dir);
    const depPkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    for (const dep of Object.keys({ ...depPkg.dependencies, ...depPkg.optionalDependencies })) {
      queue.push({ name: dep, fromDir: dir });
    }
  }
  return { bytes, packages: seen.size, pretty: pretty(bytes) };
}

async function measure(entry) {
  const result = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    outdir: join(root, '.bundle-size-tmp'),
    external,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
    metafile: true,
  });

  let minified = 0;
  let gzip = 0;
  for (const file of result.outputFiles) {
    minified += file.contents.byteLength;
    gzip += gzipSync(file.contents, { level: 9 }).byteLength;
  }
  return { minified, gzip, metafile: result.metafile };
}

// Collapse pnpm store paths (node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...)
// to plain node_modules/<pkg>/... so the treemap groups by package. Duplicate
// versions of a package merge; their bytes are summed.
function cleanMetafile(metafile) {
  const rewrite = p => p.replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//, 'node_modules/');
  const inputs = {};
  for (const [path, input] of Object.entries(metafile.inputs)) {
    inputs[rewrite(path)] ??= {
      ...input,
      imports: input.imports.map(imp => ({ ...imp, path: rewrite(imp.path) })),
    };
  }
  const outputs = {};
  for (const [path, output] of Object.entries(metafile.outputs)) {
    const merged = {};
    for (const [inputPath, { bytesInOutput }] of Object.entries(output.inputs)) {
      const clean = rewrite(inputPath);
      merged[clean] = { bytesInOutput: (merged[clean]?.bytesInOutput ?? 0) + bytesInOutput };
    }
    outputs[path] = { ...output, inputs: merged };
  }
  return { inputs, outputs };
}

// Render an interactive treemap for a metafile into .temp/ and open it.
function explorer(slug, metafile) {
  const tempDir = join(root, '.temp');
  mkdirSync(tempDir, { recursive: true });
  const metaPath = join(tempDir, `metafile-${slug}.json`);
  const htmlPath = join(tempDir, `bundle-explorer-${slug}.html`);
  writeFileSync(metaPath, JSON.stringify(cleanMetafile(metafile)));
  const result = spawnSync(
    'npx',
    ['--yes', 'esbuild-visualizer', '--metadata', metaPath, '--filename', htmlPath],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    console.error(`[analyze] esbuild-visualizer failed for ${slug}`);
    return;
  }
  const opener = { darwin: 'open', win32: 'start' }[process.platform] ?? 'xdg-open';
  spawnSync(opener, [htmlPath], { stdio: 'ignore' });
  console.log(`[analyze] explorer: ${htmlPath}`);
}

const sizes = {};
for (const { subpath, slug, entry } of entries) {
  if (!existsSync(join(root, entry))) {
    console.error(`[analyze] ${entry} not found; run \`pnpm build\` first`);
    process.exit(1);
  }
  const { minified, gzip, metafile } = await measure(entry);
  sizes[subpath] = {
    minified,
    gzip,
    pretty: `${pretty(minified)} min / ${pretty(gzip)} gzip`,
  };
  console.log(`[analyze] ${subpath.padEnd(18)} ${sizes[subpath].pretty}`);
  if (explore) explorer(slug, metafile);
}

const install = measureInstall();
console.log(`[analyze] ${'install'.padEnd(18)} ${install.pretty} across ${install.packages} packages`);

const headline = sizes['.'];
const badge = {
  schemaVersion: 1,
  label: 'bundle size',
  message: `${pretty(headline.gzip)} min+gzip`,
  color: 'informational',
  entries: sizes,
  install,
};

mkdirSync(join(root, '.github'), { recursive: true });
writeFileSync(join(root, '.github', 'bundle-size.json'), `${JSON.stringify(badge, null, 2)}\n`);
console.log(`[analyze] wrote .github/bundle-size.json (badge: ${badge.message})`);

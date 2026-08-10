import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Vite config for the published CDN bundles (`pnpm build:cdn`).
 *
 * These are the drop-in-a-script-tag builds of the two full apps, shipped
 * inside `dist/cdn/` so unpkg and jsdelivr serve them straight off npm:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@laikacms/decap-cms@4/dist/cdn/decap-cms.js"></script>
 *
 * Unlike the `vite.config.*-demo.ts` builds (unminified, sourcemapped, written
 * to the gitignored `dev-test/dist/` for local dev and e2e), these are minified,
 * self-contained, and part of the npm tarball. Only the *full* app entries get a
 * CDN bundle: the `bare` entries exist so bundler users can shrink their build,
 * which is meaningless for a prebuilt script tag.
 *
 * One config, two entries, selected by the `CDN_ENTRY` env var so the entry
 * table below stays the single source of truth. Each entry builds both formats
 * in one pass:
 *   - `iife` -> `<name>.js`, exposing the `globalName` global
 *   - `es`   -> `<name>.esm.js`, for `<script type="module">`
 *
 * Sourcemaps are off by default: they run ~20MB per bundle and would dominate
 * the npm tarball. Set `CDN_SOURCEMAP=1` to emit them for a debugging build.
 */

type CdnEntry = {
  /** Source entry, relative to the package root. */
  entry: string,
  /** Output basename: `<name>.js` (iife) and `<name>.esm.js` (es). */
  name: string,
  /** IIFE global the bundle assigns itself to. */
  globalName: string,
};

const ENTRIES: Record<string, CdnEntry> = {
  app: { entry: 'src/app/index.ts', name: 'decap-cms', globalName: 'DecapCms' },
  'laika-app': { entry: 'src/laika-app/index.ts', name: 'laika-cms', globalName: 'LaikaCms' },
};

const requested = process.env.CDN_ENTRY ?? '';
const selected = ENTRIES[requested];

if (!selected) {
  throw new Error(
    `vite.config.cdn.ts: set CDN_ENTRY to one of ${Object.keys(ENTRIES).join(', ')} (got ${
      JSON.stringify(requested)
    }).`,
  );
}

const sourcemap = Boolean(process.env.CDN_SOURCEMAP);

/**
 * Fold any extracted CSS into the JS chunks so a consumer needs exactly one tag.
 *
 * Today this is a no-op: all styling is Emotion, and the one stylesheet the
 * package touches (`ol/ol.css` in the map widget) is imported `?inline` and fed
 * to Emotion as a string, so the build emits no CSS asset. It stays as a guard -
 * the day someone adds a plain `import './x.css'`, Vite's lib mode would extract
 * it to a sibling file that no consumer's single `<script>` tag ever loads, and
 * the breakage would be silent. This turns that into a bundle that still works.
 *
 * The injector is prepended as one complete line, so every mapping in the chunk
 * shifts down by exactly one line; a single leading `;` on the VLQ `mappings`
 * string encodes that shift and keeps the sourcemap honest.
 */
function inlineCss(styleId: string): Plugin {
  return {
    name: 'laika-cdn-inline-css',
    enforce: 'post',
    generateBundle(_options, bundle) {
      let css = '';

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !fileName.endsWith('.css')) continue;
        css += typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8');
        delete bundle[fileName];
      }

      if (!css) return;

      const injector = `(function(){try{if(typeof document==="undefined")return;`
        + `if(document.querySelector('style[data-laika-cdn="${styleId}"]'))return;`
        + `var s=document.createElement("style");s.setAttribute("data-laika-cdn","${styleId}");`
        + `s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}`
        + `catch(e){console.error("[${styleId}] failed to inject bundled styles",e);}})();`;

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
        chunk.code = `${injector}\n${chunk.code}`;
        if (chunk.map) chunk.map.mappings = `;${chunk.map.mappings}`;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCss(selected.name)],
  build: {
    outDir: 'dist/cdn',
    // Both entries write into the same directory, so neither may empty it.
    // `pnpm build:cdn` clears `dist/cdn` once before running them.
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, selected.entry),
      name: selected.globalName,
      fileName: format => (format === 'iife' ? `${selected.name}.js` : `${selected.name}.esm.js`),
      // Distinct name so the two entries' CSS can't collide in the shared
      // outDir before `inlineCss` folds it away.
      cssFileName: selected.name,
      formats: ['iife', 'es'],
    },
    sourcemap,
    // Vite 8 keys its whole minify pipeline off the literal string 'oxc' (its
    // own default); `true` takes a different branch. Spell it out.
    minify: 'oxc',
    rollupOptions: {
      output: {
        // The entries have both named exports and a default; emit named exports
        // (the default stays reachable as `.default` on the IIFE global).
        exports: 'named',
        // One file per entry per format. Vite already defaults this to false for
        // `iife`; the `es` build otherwise fans out into ~140 hashed chunks that
        // both entries duplicate into the shared outDir, turning a one-URL
        // drop-in into a directory the consumer has to host intact.
        codeSplitting: false,
        // For lib+`es` Vite defaults to `{compress, mangle, codegen: false}`:
        // compressed and mangled but still pretty-printed, on the assumption a
        // downstream bundler will do the final pass. Nothing downstream of a CDN
        // URL will, and the whitespace costs ~25% raw / ~10% gzipped.
        minify: true,
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
  define: {
    // Lib-mode builds preserve `process.env.NODE_ENV` for downstream bundlers,
    // but these load straight in a browser where `process` is undefined, so it
    // must be statically replaced.
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
});

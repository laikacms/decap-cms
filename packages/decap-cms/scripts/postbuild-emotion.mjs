// Post-build pass: apply `@emotion/babel-plugin` to the compiled `dist/` output.
//
// The library is built with plain `tsc`, which does NOT run the emotion babel
// plugin. Without it, emotion *component selectors* (interpolating a styled
// component as a CSS selector, e.g. `` styled.div`${Icon} { ... }` ``) crash any
// consumer at render time with:
//   "Component selectors can only be used in conjunction with @emotion/babel-plugin".
// The fix is to stamp a stable `target` onto every styled component. `tsc` with
// an ES2022 target preserves `styled.x` tagged templates verbatim, so the plugin
// can re-process the emitted JS and add those targets (and merge source maps).
//
// Idempotent and JS-only: `.d.ts` are untouched; non-emotion modules are skipped.

import babel from '@babel/core';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const emotionPlugin = require.resolve('@emotion/babel-plugin');

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

const jsFiles = readdirSync(distDir, { recursive: true, encoding: 'utf8' })
  .filter(f => f.endsWith('.js'))
  .map(f => join(distDir, f));

let processed = 0;
let changed = 0;

for (const file of jsFiles) {
  const code = readFileSync(file, 'utf8');
  // Only touch modules that actually use emotion styled/css.
  if (!/@emotion\/(styled|react|css)/.test(code) && !/\bstyled[.(]/.test(code)) continue;

  const mapFile = `${file}.map`;
  const inputSourceMap = existsSync(mapFile)
    ? JSON.parse(readFileSync(mapFile, 'utf8'))
    : undefined;

  const result = babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename: file,
    sourceType: 'module',
    sourceMaps: true,
    inputSourceMap,
    plugins: [[emotionPlugin, { sourceMap: true, autoLabel: 'dev-only', labelFormat: '[local]' }]],
  });

  processed += 1;
  if (result.code !== code) changed += 1;

  let outCode = result.code;
  if (result.map) {
    writeFileSync(mapFile, `${JSON.stringify(result.map)}\n`);
    if (!/# sourceMappingURL=/.test(outCode)) {
      outCode += `\n//# sourceMappingURL=${basename(file)}.map\n`;
    }
  }
  writeFileSync(file, outCode);
}

console.log(`[postbuild-emotion] applied @emotion/babel-plugin to ${changed}/${processed} emotion modules`);

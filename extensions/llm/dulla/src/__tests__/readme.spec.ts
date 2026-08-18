import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

/**
 * Pins the README's usage examples against the package's actual shape: this
 * is exactly the class of bug DCMS-2130 was — a `<script>`-tag / global
 * (`DecapCmsLlmDulla.registerDulla(...)`) example that no build here ever
 * produced, since this package emits plain ES modules only.
 *
 * This reads `index.ts`'s source rather than importing it: `register.ts`
 * pulls in the CMS's `Registry`, which touches `window` at module-evaluation
 * time, so executing this package's barrel is only safe in a DOM
 * environment (see `vitest.config.ts`), not the plain `node` one these
 * transport-level tests run under.
 */

const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
const indexSource = readFileSync(join(__dirname, '../index.ts'), 'utf8');

const exportedNames = new Set(
  [...indexSource.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)]
    .flatMap(match => match[1].split(','))
    .map(name => name.trim().split(/\s+as\s+/).pop() as string)
    .filter(Boolean),
);

describe('README usage examples', () => {
  it('never documents a <script>-tag / global-variable route', () => {
    // This package is `"type": "module"`, built with plain `tsc` (no
    // bundler, no `unpkg`/`browser` field) — it never emits a UMD/IIFE
    // bundle, so no global such as `DecapCmsLlmDulla` can exist. Checked
    // against fenced code blocks only, so prose is free to mention
    // `<script>` while explaining why there isn't one (as this README does).
    const fencedBlocks = [...readme.matchAll(/```[\s\S]*?```/g)].map(match => match[0]);

    for (const block of fencedBlocks) {
      expect(block).not.toMatch(/<script[\s>]/i);
      expect(block).not.toMatch(/DecapCmsLlmDulla/);
    }
  });

  it('only names exports the package actually has', () => {
    const codeBlocks = [...readme.matchAll(/```(?:ts|tsx|js|jsx)\n([\s\S]*?)```/g)]
      .map(match => match[1]);

    expect(codeBlocks.length).toBeGreaterThan(0);

    const importedNames = codeBlocks
      .flatMap(block => [...block.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@laikacms\/decap-cms-llm-dulla['"]/g)])
      .flatMap(match => match[1].split(','))
      .map(name => name.trim())
      .filter(Boolean);

    expect(importedNames.length).toBeGreaterThan(0);

    for (const name of importedNames) {
      expect(exportedNames.has(name)).toBe(true);
    }
  });

  it('matches the package.json this README describes', () => {
    // Guards the premise of the two tests above: if this package ever grows a
    // bundler step (`unpkg`/`browser`/UMD output), the README is free to
    // document a script-tag route again, but this pin should be revisited too.
    expect(packageJson.type).toBe('module');
    expect(packageJson).not.toHaveProperty('unpkg');
    expect(packageJson).not.toHaveProperty('browser');
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { flattenPhrases } from '@/core/i18n/polyglot';
import { en } from '@/locales';

/**
 * Every `t('some.key')` literal in the source has to resolve against the `en`
 * pack. Polyglot renders an unknown key as the key itself, which is not just
 * ugly: the ported richtext toolbar kept upstream's
 * `editor.editorWidgets.markdown.*` namespace after the pack renamed it to
 * `richtext`, and the raw keys were wide enough to squeeze the button row down
 * to its min-content width, stacking the whole toolbar vertically.
 *
 * Only literal keys are scanned, and only those whose first segment is a real
 * top-level namespace, so unrelated dotted strings stay out of the sweep.
 */

// `fileURLToPath` takes the string, not a `new URL(...)`: under jsdom the global
// `URL` is whatwg-url, and Node rejects those instances as non-file URLs.
const srcDir = resolve(fileURLToPath(import.meta.url), '../../..');

const enKeys = new Set(Object.keys(flattenPhrases(en)));
const namespaces = new Set(Object.keys(en));

// `\bt(` also catches `props.t('…')` while skipping identifiers like `parseInt(`.
const callPattern = /\bt\(\s*'([^'\n]+)'/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === '__mocks__' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [path] : [];
  });
}

describe('translation key usage', () => {
  it('resolves every literal translation key against the en pack', () => {
    const unknown: string[] = [];

    for (const file of sourceFiles(srcDir)) {
      const source = readFileSync(file, 'utf8');
      for (const [, key] of source.matchAll(callPattern)) {
        if (!namespaces.has(key.split('.')[0]) || enKeys.has(key)) {
          continue;
        }
        unknown.push(`${file.slice(srcDir.length)}: ${key}`);
      }
    }

    expect(unknown).toEqual([]);
  });
});

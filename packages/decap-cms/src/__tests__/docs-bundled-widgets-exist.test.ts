import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// docs/ lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const DOC_PATH = path.join(REPO_ROOT, 'docs/community-widgets.md');
const WIDGETS_DIR = path.join(REPO_ROOT, 'packages/decap-cms/src/widgets');

// The doc's "bundled, opt-in widgets" callout names a parenthetical example
// list like: `(e.g. `radix-icon`, `lucide-icon`, `map`, `aichat`)`. Extract
// the backtick-quoted names out of that specific sentence rather than every
// backtick span in the file, so unrelated inline code (subpath examples,
// the registerWidget snippet) doesn't get swept in.
const BUNDLED_WIDGETS_SENTENCE =
  /This repo ships several bundled, opt-in widgets under\s*\n?`@laikacms\/decap-cms\/widgets\/\*`\s*\(e\.g\.\s*([^)]+)\)/;

function extractBundledWidgetNames(docContents: string): string[] {
  const match = docContents.match(BUNDLED_WIDGETS_SENTENCE);
  if (!match) {
    throw new Error(
      `Could not find the "bundled, opt-in widgets" sentence in ${path.relative(REPO_ROOT, DOC_PATH)}. ` +
        'Update BUNDLED_WIDGETS_SENTENCE in this test to match the doc\'s current wording.',
    );
  }
  const namesList = match[1];
  return [...namesList.matchAll(/`([\w-]+)`/g)].map(m => m[1]);
}

describe('docs/community-widgets.md bundled-widget list matches real widgets (DCMS-2087)', () => {
  it('lists at least one bundled widget', () => {
    const contents = fs.readFileSync(DOC_PATH, 'utf8');
    const names = extractBundledWidgetNames(contents);
    expect(names.length).toBeGreaterThan(0);
  });

  it('every named bundled widget has a README and exports a Widget factory', () => {
    const contents = fs.readFileSync(DOC_PATH, 'utf8');
    const names = extractBundledWidgetNames(contents);

    const offenders: string[] = [];

    for (const name of names) {
      const widgetDir = path.join(WIDGETS_DIR, name);
      const readmePath = path.join(widgetDir, 'README.md');
      const indexPath = path.join(widgetDir, 'index.ts');

      if (!fs.existsSync(widgetDir)) {
        offenders.push(`${name}: no directory at packages/decap-cms/src/widgets/${name}`);
        continue;
      }
      if (!fs.existsSync(readmePath)) {
        offenders.push(`${name}: missing packages/decap-cms/src/widgets/${name}/README.md`);
      }
      if (!fs.existsSync(indexPath)) {
        offenders.push(`${name}: missing packages/decap-cms/src/widgets/${name}/index.ts (no Widget factory)`);
        continue;
      }
      const indexSource = fs.readFileSync(indexPath, 'utf8');
      if (!/\bWidget\b/.test(indexSource)) {
        offenders.push(`${name}: index.ts does not appear to export a Widget factory`);
      }
    }

    // If this fails, docs/community-widgets.md's bundled-widget list has
    // drifted from what actually ships under packages/decap-cms/src/widgets/
    // (see DCMS-2087 / #2091, where `icon-picker` was listed but only ever
    // contained a shared hook, no README, and no Widget factory). Either
    // build the missing widget out fully, or remove its name from the doc.
    expect(offenders).toEqual([]);
  });
});

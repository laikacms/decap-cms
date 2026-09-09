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
const DOC_PATH = path.join(REPO_ROOT, 'docs/editor-guide.md');
const EXTENSIONS_WIDGETS_DIR = path.join(REPO_ROOT, 'extensions/widgets');

// The doc's "optional widgets" paragraph describes the icon picker. Pull out
// just that sentence so we don't accidentally match unrelated `@laikacms/*`
// package names elsewhere in the file (e.g. the map/ai-chat bullets).
const ICON_PICKER_SENTENCE =
  /\*\*icon picker\*\*[^.]*?install one\s*\n?of the standalone(.*?)packages and register it/s;

function extractIconPickerPackageNames(docContents: string): string[] {
  const match = docContents.match(ICON_PICKER_SENTENCE);
  if (!match) {
    throw new Error(
      `Could not find the "icon picker" sentence in ${path.relative(REPO_ROOT, DOC_PATH)}. ` +
        'Update ICON_PICKER_SENTENCE in this test to match the doc\'s current wording.',
    );
  }
  return [...match[1].matchAll(/`(@laikacms\/[\w-]+)`/g)].map(m => m[1]);
}

describe('docs/editor-guide.md icon-picker bullet names real packages (DCMS-2267)', () => {
  it('does not describe "icon picker" as a bare phrase with no package reference', () => {
    const contents = fs.readFileSync(DOC_PATH, 'utf8');
    const names = extractIconPickerPackageNames(contents);
    expect(names.length).toBeGreaterThan(0);
  });

  it('every named icon-picker package has a corresponding extensions/widgets/* directory', () => {
    const contents = fs.readFileSync(DOC_PATH, 'utf8');
    const names = extractIconPickerPackageNames(contents);

    const offenders: string[] = [];

    for (const name of names) {
      const dirName = name.replace('@laikacms/decap-cms-widget-', '');
      const widgetDir = path.join(EXTENSIONS_WIDGETS_DIR, dirName);
      const packageJsonPath = path.join(widgetDir, 'package.json');

      if (!fs.existsSync(widgetDir)) {
        offenders.push(`${name}: no directory at extensions/widgets/${dirName}`);
        continue;
      }
      if (!fs.existsSync(packageJsonPath)) {
        offenders.push(`${name}: missing extensions/widgets/${dirName}/package.json`);
        continue;
      }
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { name?: string };
      if (pkg.name !== name) {
        offenders.push(
          `${name}: extensions/widgets/${dirName}/package.json name is "${pkg.name}", expected "${name}"`,
        );
      }
    }

    // If this fails, docs/editor-guide.md's icon-picker bullet has drifted
    // from what actually ships under extensions/widgets/ (see DCMS-2267,
    // where the bullet named no package at all, unlike its map/ai-chat
    // siblings). Fix the doc to name the real package(s).
    expect(offenders).toEqual([]);
  });

  it('names both bundled icon-widget packages', () => {
    const contents = fs.readFileSync(DOC_PATH, 'utf8');
    const names = extractIconPickerPackageNames(contents);

    expect(names).toEqual(
      expect.arrayContaining([
        '@laikacms/decap-cms-widget-lucide-icon',
        '@laikacms/decap-cms-widget-radix-icon',
      ]),
    );
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// `registerEditorComponent` (the pre-Lexical shortcode/embed API, keyed on
// `pattern`/`fromBlock`/`toBlock`/`toPreview`) was removed and replaced by
// `CMS.registerBlock` (PT-native custom blocks, see
// `src/widgets/richtext/README.md` "Custom blocks" and BREAKING_CHANGES_V2_BETA.md).
// DCMS-1150/#1151 found two live docs still teaching the removed API verbatim
// (core/README.md, skills/decap-widget-development/SKILL.md) years after the
// removal, because nothing checked docs against the actual exports.
//
// This is the pinning check for that class of drift: it asserts
// `registerEditorComponent` is not exported anywhere in `src` (i.e. it really
// is gone), then scans every doc file in the package for call-syntax mentions
// (`registerEditorComponent(`) that would teach a reader to call it. A doc is
// allowed to *mention* the removed name in passing (e.g. "replaces the
// removed `registerEditorComponent` API"), only call-syntax usage, which
// implies it's still callable, fails the test.

const packageRoot = path.resolve(__dirname, '../..');
const srcDir = path.join(packageRoot, 'src');
const skillsDir = path.join(packageRoot, 'skills');

const REMOVED_API_NAME = 'registerEditorComponent';
// Matches the removed API used as a call/definition: `registerEditorComponent(`,
// `.registerEditorComponent(`, or `function registerEditorComponent(`. Doesn't
// match bare-word mentions like "the removed `registerEditorComponent` API".
const CALL_SYNTAX_PATTERN = new RegExp(`\\b${REMOVED_API_NAME}\\s*\\(`);

function listFilesRecursive(dir: string, extensions: string[]): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      files.push(...listFilesRecursive(full, extensions));
    } else if (extensions.includes(path.extname(entry))) {
      files.push(full);
    }
  }

  return files;
}

describe(`removed API "${REMOVED_API_NAME}" doc pin (DCMS-1150/#1151)`, () => {
  it(`is not exported anywhere under src/ (confirms it is actually gone)`, () => {
    const sourceFiles = listFilesRecursive(srcDir, ['.ts', '.tsx']);
    const exportPattern = new RegExp(`export\\s+(function|const)\\s+${REMOVED_API_NAME}\\b`);

    const filesExportingIt = sourceFiles.filter(file => exportPattern.test(readFileSync(file, 'utf8')));

    expect(
      filesExportingIt,
      `expected no src file to export ${REMOVED_API_NAME}; found: ${filesExportingIt.join(', ')}`,
    ).toEqual([]);
  });

  it('is not taught as callable in any doc (.md) file in this package', () => {
    const docFiles = [
      ...listFilesRecursive(srcDir, ['.md']),
      ...listFilesRecursive(skillsDir, ['.md']),
    ];

    const offenders = docFiles
      .map(file => ({ file, content: readFileSync(file, 'utf8') }))
      .filter(({ content }) => CALL_SYNTAX_PATTERN.test(content))
      .map(({ file }) => path.relative(packageRoot, file));

    expect(
      offenders,
      `expected no doc to call/define ${REMOVED_API_NAME}(...), it was removed in favor of `
        + `CMS.registerBlock (see src/widgets/richtext/README.md "Custom blocks"). Found call-syntax `
        + `mentions in: ${offenders.join(', ')}. If this API is ever reintroduced, first add a matching `
        + `export under src/ so the sibling test above passes, then remove this pin.`,
    ).toEqual([]);
  });
});

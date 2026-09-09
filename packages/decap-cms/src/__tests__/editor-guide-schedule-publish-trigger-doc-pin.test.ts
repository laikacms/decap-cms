import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// DCMS-2247 (#2264): docs/editor-guide.md's "Schedule publish" paragraph
// said the entry "publishes the next time someone has the CMS open in a
// browser tab at or after the scheduled time", with the Editorial Workflow
// board only mentioned as a parenthetical detail of the periodic re-check.
// Read plainly, that implies any open CMS tab (Editor, Collection, etc.)
// would trigger a due scheduled publish.
//
// Reality: `checkScheduledPublishes()`
// (packages/decap-cms/src/core/actions/editorialWorkflow.tsx:701) is
// dispatched from exactly one place - the Workflow board's own mount effect
// (packages/decap-cms/src/core/components/Workflow/Workflow.tsx:81-99), and
// `<Workflow />` only renders on the `/workflow` route. Having the CMS open
// on any other route does nothing for a due scheduled publish. This test
// pins the corrected wording so the doc can't silently regress back to
// implying "CMS open" generally is enough.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const editorGuidePath = path.join(REPO_ROOT, 'docs', 'editor-guide.md');

describe('editor-guide scheduled publish trigger doc pin (DCMS-2247)', () => {
  const editorGuide = readFileSync(editorGuidePath, 'utf8');
  // docs/editor-guide.md hard-wraps prose at ~100 columns, so a phrase can
  // legitimately straddle a line break; normalize whitespace before matching
  // multi-word phrases so wrap-point reflow doesn't false-negative this test.
  const normalized = editorGuide.replace(/\s+/g, ' ');

  it('names the Editorial Workflow board, not "CMS open in a browser tab", as the trigger', () => {
    const scheduleParagraphMatch = normalized.match(/Once an entry is Ready and saved.*?(?= ##)/);

    expect(
      scheduleParagraphMatch,
      'Could not find the "Schedule publish" paragraph in docs/editor-guide.md',
    ).not.toBeNull();

    const scheduleParagraph = scheduleParagraphMatch![0];

    expect(scheduleParagraph).toMatch(
      /that browser has the Editorial Workflow board open at or after the scheduled time/,
    );
    expect(scheduleParagraph).toMatch(/checked when the board mounts and about once a minute/);
    expect(scheduleParagraph).toMatch(
      /simply having an entry editor open elsewhere in the CMS does not trigger it/,
    );
  });

  it('does not claim any open CMS browser tab is sufficient to trigger the check', () => {
    expect(normalized).not.toMatch(/someone has the CMS open in a browser tab/);
  });

  it('ties the "same browser" local-storage caveat to the Workflow board being open', () => {
    expect(normalized).toMatch(
      /same browser\* \(not a teammate's browser or another device\) has the Editorial Workflow board open/,
    );
  });
});

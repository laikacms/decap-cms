import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-1971 split the map widget out of `decap-cms` and into the
// standalone `extensions/widgets/map` package (`decap-cms-widget-map`).
// `docs/editor-guide.md` and `packages/decap-cms/dev-test/README.md` still
// described the pre-split API: install the optional `ol` peer dependency and
// call a `registerMapWidget()` function that no longer exists anywhere in the
// repo, and pointed at `packages/decap-cms/src/widgets/map/README.md`, a path
// that no longer exists. The real API is the standard community-widget
// pattern: `CMS.registerWidget(DecapCmsWidgetMap.Widget())`.

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const editorGuidePath = path.join(repoRoot, 'docs', 'editor-guide.md');
const devTestReadmePath = path.join(repoRoot, 'packages', 'decap-cms', 'dev-test', 'README.md');

describe('map widget doc pin (DCMS-2123)', () => {
  it('docs/editor-guide.md does not reference the removed registerMapWidget() API or path', () => {
    const doc = readFileSync(editorGuidePath, 'utf8');

    expect(doc).not.toContain('registerMapWidget');
    expect(doc).not.toContain('packages/decap-cms/src/widgets/map');
  });

  it("docs/editor-guide.md's map widget bullet names the real package", () => {
    const doc = readFileSync(editorGuidePath, 'utf8');

    expect(doc).toMatch(/decap-cms-widget-map|extensions\/widgets\/map/);
  });

  it('packages/decap-cms/dev-test/README.md does not reference the removed registerMapWidget() API or path', () => {
    const doc = readFileSync(devTestReadmePath, 'utf8');

    expect(doc).not.toContain('registerMapWidget');
    expect(doc).not.toContain('packages/decap-cms/src/widgets/map');
  });
});

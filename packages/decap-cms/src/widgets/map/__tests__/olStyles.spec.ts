import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { olStyles } from '@/widgets/map/olStyles';

// `olStyles.ts` is a vendored copy of `ol/ol.css` (see the header comment there
// for why the widget cannot import the file directly). A vendored asset drifts
// silently: bumping `ol` in the catalog would leave the widget rendering last
// version's controls, with nothing failing. This reads the stylesheet out of
// the installed `ol` package and pins the copy to it.
//
// If this fails after an `ol` upgrade, regenerate `olStyles.ts` from the file
// this test resolves rather than editing either side by hand.
const require = createRequire(import.meta.url);

function readInstalledOlCss(): string {
  const olEntry = require.resolve('ol');
  const cssPath = path.join(path.dirname(olEntry), 'ol.css');
  return fs.readFileSync(cssPath, 'utf8');
}

describe('vendored OpenLayers stylesheet', () => {
  it('matches the stylesheet shipped by the installed `ol`', () => {
    expect(olStyles.trim()).toBe(readInstalledOlCss().trim());
  });

  it('carries the rules the widget actually depends on', () => {
    // A smoke check that the vendored string is a stylesheet and not, say, an
    // empty file or an error page: `.ol-viewport` and `.ol-control` are the
    // classes OpenLayers puts on the elements this widget mounts.
    expect(olStyles).toContain('.ol-viewport');
    expect(olStyles).toContain('.ol-control');
  });
});

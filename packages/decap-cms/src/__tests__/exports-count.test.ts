import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

describe('package.json#exports', () => {
  it('pins the documented subpath count (see RESTRUCTURE.md "What changed")', () => {
    const keys = Object.keys(packageJson.exports as Record<string, unknown>);
    const nonSubpathKeys = ['.', './package.json'];
    const subpaths = keys.filter(key => !nonSubpathKeys.includes(key));

    // If this fails, `package.json#exports` gained or lost subpaths. Update
    // this expected count *and* the "N subpaths" line in RESTRUCTURE.md
    // together so the doc never re-drifts from reality.
    expect(subpaths.length).toBe(34);
  });
});

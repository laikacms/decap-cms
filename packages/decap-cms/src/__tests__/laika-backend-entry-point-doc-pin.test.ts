import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-1864: the package README told readers "if you use the `laika`
// backend, read src/backends/laika/README.md first" with no mention that the
// `laika` backend is *only* registered by the `laika-app` entry point
// (src/laika-app/extensions.ts) — the default root import (`app/extensions.ts`,
// what plain `import CMS from '@laikacms/decap-cms'` gives you) never calls
// `CMS.registerBackend('laika', ...)`. A reader following the README's
// default quickstart with `backend: { name: laika }` got a silent
// "backend not registered" failure with no pointer to the fix.
//
// This pins the fix from both directions:
//   1. The two doc files that guide `laika` usage (the package README and
//      the backend's own README) must say the `laika-app` entry point is
//      required, not the root import.
//   2. The default app's registration list (`src/app/extensions.ts`) must
//      still NOT register `laika` — if that ever changes (i.e. the project
//      goes with option (b) from #1864 instead: registering `laika` in the
//      default app too), this assertion starts failing as a signal that the
//      doc guidance added here is now stale and needs to be revisited.

const packageRoot = path.resolve(__dirname, '../..');
const readmePath = path.join(packageRoot, 'README.md');
const laikaReadmePath = path.join(packageRoot, 'src/backends/laika/README.md');
const defaultAppExtensionsPath = path.join(packageRoot, 'src/app/extensions.ts');
const laikaAppExtensionsPath = path.join(packageRoot, 'src/laika-app/extensions.ts');

describe('laika backend entry point doc pin (DCMS-1864)', () => {
  it('package README tells readers the laika backend needs the laika-app entry point', () => {
    const readme = readFileSync(readmePath, 'utf8');

    expect(readme).toMatch(/laika-app/);
    expect(readme).toMatch(/root export|root import/);
  });

  it("backend README's usage section imports from laika-app, not the package root", () => {
    const laikaReadme = readFileSync(laikaReadmePath, 'utf8');

    expect(laikaReadme).toMatch(/@laikacms\/decap-cms\/laika-app/);
    // The old snippet imported a default export off the package root that
    // doesn't exist (`import CMS from '@laikacms/decap-cms'`) and never wired
    // into any actually-bootstrapped app. Guard against that regressing.
    expect(laikaReadme).not.toMatch(/import CMS from ['"]@laikacms\/decap-cms['"]/);
  });

  it('default app entry point does not register the laika backend', () => {
    const defaultAppExtensions = readFileSync(defaultAppExtensionsPath, 'utf8');

    expect(
      defaultAppExtensions,
      "src/app/extensions.ts now registers 'laika', but the docs updated for DCMS-1864 say the "
        + 'opposite (that the root/default app entry point never registers it and laika-app is '
        + 'required instead). Update README.md and src/backends/laika/README.md to match.',
    ).not.toMatch(/registerBackend\(\s*['"]laika['"]/);
  });

  it('laika-app entry point does register the laika backend', () => {
    const laikaAppExtensions = readFileSync(laikaAppExtensionsPath, 'utf8');

    expect(laikaAppExtensions).toMatch(/registerBackend\(\s*['"]laika['"]/);
  });
});

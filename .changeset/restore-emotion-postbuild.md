---
'@laikacms/decap-cms': patch
---

Restore the `@emotion/babel-plugin` post-build pass on `dist/` (DCMS-1909). The package builds with
plain `tsc`, which does not run the emotion babel plugin, so any emotion *component selector*
(interpolating a styled component as a CSS selector, e.g. `` `${Icon} { ... }` ``) crashes every
consumer at render time with "Component selectors can only be used in conjunction with
@emotion/babel-plugin". A `scripts/postbuild-emotion.mjs` pass that stamps stable `target`s onto
compiled styled components (and merges source maps) existed for this exact reason but its wiring
into `packages/decap-cms/package.json`'s `build` script was dropped, unnoticed, during the
root-to-`packages/decap-cms` workspace-layout move; the now-orphaned script file was later deleted
entirely as dead code. Re-add the script, its `@babel/core` / `@emotion/babel-plugin` devDependencies,
and the `build` step so the published package is safe to consume without the transform, without
requiring every downstream consumer to configure Emotion's babel/swc plugin in their own bundler.

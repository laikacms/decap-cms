---
'@laikacms/decap-cms': minor
---

Add a tree-shakeable `@laikacms/decap-cms/app/bare` entry point for the classic
(non-laika) app shell, mirroring `@laikacms/decap-cms/laika-app/bare`. Like the
laika bare entry, it exposes the same public API as `/app` but skips the eager
`registerExtensions()` and the auto-init at module load, so consumers can
register only the backends/widgets/entry-codecs they use and let the bundler
tree-shake the rest. `./app/bare` is now tracked in the bundle-size badge
(`.github/bundle-size.json`).

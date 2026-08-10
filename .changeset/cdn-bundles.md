---
'@laikacms/decap-cms': minor
---

Ship prebuilt CDN bundles for the two full app shells. `pnpm build:cdn` (run by `prepack`) emits
`dist/cdn/decap-cms.js` and `dist/cdn/laika-cms.js` as self-contained minified IIFE bundles exposing
`DecapCms` / `LaikaCms` globals, plus `*.esm.js` siblings for `<script type="module">`. Everything
is inlined, so unpkg and jsdelivr serve a working CMS off a single URL with no bundler and no peer
installs. The `unpkg`/`jsdelivr` fields point at the classic bundle. These are raw tarball paths,
not subpath exports, so `package.json#exports` is unchanged.

Only the full `app` and `laika-app` entries get a CDN build: the `bare` entries exist so a bundler
can tree-shake, which a prebuilt script tag cannot do.

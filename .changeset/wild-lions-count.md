---
'@laikacms/decap-cms': patch
---

Workspace restructure, upstream fleet fixes, and new content-format infrastructure.

New features:

- Entry codecs (`entry-codecs/{yaml,toml,json,markdown}` subpath exports) replace the internal
  `core/formats` yaml/toml/json/frontmatter modules; codecs are registered per app entry and
  missing-codec configs get clear diagnostics.
- Format packs gain an `mdx` pack alongside html/markdown/plaintext updates.
- New `laika` backend.
- Code widget: lazy-loaded control and pluggable keymap loaders.
- Visual Editing (stega) documentation and collection/field `visualEditing` config docs.
- `InViewTrigger` primitive replaces `react-waypoint` (dependency dropped, DCMS-548).

Fixes ported from the upstream fleet line (DCMS-525..651):

- Responsive fixes on mobile viewports: collection sidebar, editor split pane, media library modal
  and card grid (DCMS-641/642/643).
- Richtext: pasted image `src` sanitization, beacon leak stopped for allowed-protocol pasted images,
  `OverflowNode` content included in serialized output (DCMS-636/639/640).
- Relation and select widgets portal their menus to `document.body` so options are not overlaid by
  sibling fields (DCMS-U-0716a).
- `PkceAuthenticator` now fails fast when `base_url` is missing, matching documented behavior
  (DCMS-647).

The repository itself is now a pnpm workspace: the package moved from the repo root to
`packages/decap-cms` with no change to the published package layout.

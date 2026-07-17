---
'@laikacms/decap-cms': patch
---

Keyboard shortcuts, paginated media library, richtext table paste, and auth/i18n/dnd fixes.

New features:

- Global keyboard shortcuts: a shortcut engine (`core/lib/shortcuts`, `useShortcut` hook) with
  chords, typing suppression, and modal coordination. The Laika shell gets 'g <key>' collection
  chords (configurable per collection via the new `shortcut` config key), a shortcut help dialog,
  kbd hints in the command palette and sidebar, and arrow-key list navigation. The editor focuses
  the first field on mount and restores focus after save; the preview iframe forwards its keydowns
  so mod+S keeps saving the entry.
- Paginated media library: backends can implement `getMediaCapabilities`/`getMediaPage` to load
  media one cursor page at a time, with search delegated to backends that declare `dynamicSearch`.
  Backends without the new surface keep the legacy full `getMedia()` load. The laika backend
  implements pagination and search via the assets repository's cursor listing.
- Richtext: pasted HTML tables are parsed into Portable Text tables instead of being flattened into
  paragraphs (header rows detected, marks and nested markup inside cells preserved, DCMS-253). The
  editor also reserves a left gutter so the draggable-block handle no longer overlays text.
- Extra routes registered by consumers now support `:name` segment and trailing `*` patterns;
  captured params are passed to the route's `element` when it is a function.

Fixes:

- PKCE auth no longer wipes the `#/` route and history state on every reload; the pre-auth hash
  route is stashed before redirecting to the provider and restored after the token exchange, so deep
  links survive login.
- Save/Publish no longer silently fails on i18n collections: `serializeI18n` rebuilds the i18n
  branch immutably instead of mutating frozen redux state (DCMS-471).
- Laika backend: deleting media from the media library now routes public_folder-prefixed paths to
  the assets repository, so deletes actually remove the stored asset instead of reporting success
  while it survived.
- Drag and drop uses one shared dnd-core manager across all providers, avoiding the "two HTML5
  backends" crash when the media library and a sortable widget mount together.

# Changelog

## 4.1.0

### Minor Changes

- 3b8a0b6: laika backend: use the Cognito access token as the API bearer instead of the id_token (the
  management server resolves the user by `sub` and requires `token_use: 'access'`), and let
  `PkceAuthenticator` take an explicit `redirect_uri` plus a `return_to` path carried in `state`
  alongside the CSRF nonce, so the embedded CMS can use one fixed Cognito callback route and bounce
  back to the originating per-project route. `return_to` is validated as a same-origin path both at
  construction and again before the nonce is consumed. Also fixes a nonce-replay bug where
  `validateNonce` only cleared `localStorage` while `createNonce` wrote to `sessionStorage`.
- c82687e: Add Slovak (`sk`) UI locale, ported from decaporg/decap-cms#7844 (DCMS-1053).
- 9155edc: Added a top-level `field_groups` config map of name -> field list. Reference a group from any
  collection/file/nested `object`/`list` field with `{ group: '<name>' }` in place of a regular field
  entry; `normalizeConfig` expands it in place (deep-cloned, recursing into nested fields) before the
  rest of the app ever sees a field, with a clear error for unknown or circular group references
  (DCMS-1419).
- 3524aa2: Number widget: add a `slider: true` config option (DCMS-1424) that renders a native range slider
  alongside the numeric input, respecting the existing `min`/`max`/`step` schema values (falling back
  to a 0-100 range when `min`/`max` are unset). Both inputs share the same `onChange` handler and stay
  in sync.

### Patch Changes

- fd98fb8: AI chat widget, icon picker widgets, config-derived entry types, session re-auth overlay, and safer
  local backups.

  New features:

  - AI chat folded into the package (DCMS-492): the server-side adapter (fetch handler, providers,
    document tools, i18n) is exposed as the `ai` subpath export, and the `aichat` control/preview
    widget pair moved in from `@laikacms/decap-ai`.
  - New `lucide-icon` and `radix-icon` picker widgets: searchable icon pickers with previews.
    `lucide-react` and `@radix-ui/react-icons` are optional peer dependencies used only by these
    widgets.
  - New `config-types` subpath export: TS utility types that derive entry shapes from a const-asserted
    Decap config.
  - Expired sessions now show a blocking re-auth overlay instead of logging out, so unsaved work
    survives an expired access token. The auth reducer is an RTK slice with a `sessionExpired` action
    driven by a session listener middleware; transient auth failures no longer destroy the stored
    session, only a definitive backend rejection does.

  Dependency changes for consumers:

  - The github and gitlab GraphQL backends now use `@apollo/client` v4: the optional
    `apollo-cache-inmemory`, `apollo-client`, `apollo-link-context` and `apollo-link-http` peer
    dependencies are replaced by a single optional `@apollo/client` peer dependency.
  - The unused `./default-exports`, `./editor-component-image` and `./editor-component-embedded-entry`
    subpath exports are removed; their source modules were already deleted.

  Fixes:

  - The colorstring widget parses colors again (named colors, `rgb()`/`rgba()`, short hex) via a small
    local parser, restoring the pre-4.0 normalization behavior that was lost when `tinycolor2` was
    dropped: with `enableAlpha` the picker works in rgba space and fully opaque colors are stored as
    short hex.
  - Nested-collection breadcrumbs in the Laika shell now follow the tree path: every ancestor folder
    is a crumb linking to its `/collections/<name>/filter/<path>` view instead of the breadcrumb
    always pointing straight back at the dashboard. The `renderCollectionTop` slot receives the new
    `filterTerm` render prop.
  - Local entry backups can no longer be lost by a misclick: leaving an entry flushes the pending
    backup write instead of deleting it, and declining the restore prompt keeps the backup. Backups
    are only removed by a successful persist, publish, or delete.
  - Richtext: `portableTextToLexical` maps the reserved image and horizontal-rule blocks (DCMS-1183),
    and the hr transformer no longer sets the `isImport` flag (DCMS-1192).

  Internal changes:

  - Lucide icons are vendored under `ui/icons` and TopBarProgress is a local primitive, so
    `lucide-react` and `react-topbar-progress-indicator` are no longer runtime dependencies. The
    `fuzzy` package is replaced by a local matcher and the dev server logs via `console` instead of
    `winston`.
  - The dead `default-exports` and `editor-component-image` modules are removed, along with the
    `DECAP_CMS_*_VERSION` console banner and window version globals.
  - The e2e suite finished migrating from Cypress to Playwright.

- a61641b: Replace the legacy Apollo GraphQL stack with `@apollo/client` v4.

  The GitHub and GitLab GraphQL backends (`use_graphql: true`) now use `@apollo/client` v4 instead of
  the deprecated `apollo-client` 2.x packages (`apollo-client`, `apollo-cache-inmemory`,
  `apollo-link-http`, `apollo-link-context`). Behavior is unchanged: same queries, fetch policies, and
  cache updates, with the v4 client configured not to send Apollo's client-awareness telemetry
  extension to Git hosts.

  **Migration (only if you use `use_graphql: true`):** swap the optional peer dependencies:

  ```sh
  pnpm remove apollo-client apollo-cache-inmemory apollo-link-http apollo-link-context
  pnpm add @apollo/client rxjs
  ```

  `graphql` and `graphql-tag` remain optional peers; `rxjs` is required by `@apollo/client` v4.

- 32a9e83: Media library modal: made the card grid, search box, and close-button/title layout responsive at
  small viewport widths — cards fill their grid cell instead of a fixed 280px width, the search input
  shrinks instead of overflowing at a fixed 400px, and the close button sits inline with the title
  below 500px instead of being clipped off-screen by its -40px offset (DCMS-1051, ports upstream
  3c3fd819f / decaporg#7820).
- 863867a: laika backend: fail fast with an actionable client-side error when persisting a non-JSON-format
  collection (markdown/frontmatter — Decap's default when no `format:` is set — YAML, or TOML), instead
  of sending a raw string as `content` and getting an opaque 400 from the documents API. Set
  `format: json` on the collection to use the laika backend today.
- db31ceb: Editorial workflow board: added a per-card "move to previous/next status" keyboard action (dispatching
  the same `updateUnpublishedEntryStatus` code path as drag-and-drop) plus an `aria-live` region that
  announces every status change, whether triggered by keyboard or drag (DCMS-1305 AC4-5).
- df5734f: Localization, accessibility, responsive UI, Laika validation, and dependency cleanup improvements.
- 304bca9: Keyboard shortcuts, paginated media library, richtext table paste, and auth/i18n/dnd fixes.

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

- 85416b2: laika backend: silently refresh expired access tokens via the OAuth refresh grant.

  The backend now stores the full token triple (access token, refresh token, expiry) and
  `tokenPromise` re-evaluates expiry on every call, refreshing single-flight through the token
  endpoint (the server rotates the pair on refresh). An unrecoverably dead session is reported through
  the new `ImplementationInitOptions.onSessionExpired` callback, exposed as
  `Backend.onSessionExpired(listener)` and wired by the app shell to a logout — the user gets the
  login screen instead of stale-session 401s rendered as not-found pages. `currentBackend` is now
  exported from `./core` so host apps can obtain refresh-aware tokens via `getToken()` instead of
  reading stored tokens directly.

- 49b8a8e: Workspace restructure, upstream fleet fixes, and new content-format infrastructure.

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

## 4.1.0-alpha.5

### Minor Changes

- c82687e: Add Slovak (`sk`) UI locale, ported from decaporg/decap-cms#7844 (DCMS-1053).

### Patch Changes

- 32a9e83: Media library modal: made the card grid, search box, and close-button/title layout responsive at
  small viewport widths — cards fill their grid cell instead of a fixed 280px width, the search input
  shrinks instead of overflowing at a fixed 400px, and the close button sits inline with the title
  below 500px instead of being clipped off-screen by its -40px offset (DCMS-1051, ports upstream
  3c3fd819f / decaporg#7820).
- 863867a: laika backend: fail fast with an actionable client-side error when persisting a non-JSON-format
  collection (markdown/frontmatter — Decap's default when no `format:` is set — YAML, or TOML), instead
  of sending a raw string as `content` and getting an opaque 400 from the documents API. Set
  `format: json` on the collection to use the laika backend today.
- db31ceb: Editorial workflow board: added a per-card "move to previous/next status" keyboard action (dispatching
  the same `updateUnpublishedEntryStatus` code path as drag-and-drop) plus an `aria-live` region that
  announces every status change, whether triggered by keyboard or drag (DCMS-1305 AC4-5).
- Localization, accessibility, responsive UI, Laika validation, and dependency cleanup improvements.

## 4.0.4-alpha.4

### Patch Changes

- fd98fb8: AI chat widget, icon picker widgets, config-derived entry types, session re-auth overlay, and safer
  local backups.

  New features:

  - AI chat folded into the package (DCMS-492): the server-side adapter (fetch handler, providers,
    document tools, i18n) is exposed as the `ai` subpath export, and the `aichat` control/preview
    widget pair moved in from `@laikacms/decap-ai`.
  - New `lucide-icon` and `radix-icon` picker widgets: searchable icon pickers with previews.
    `lucide-react` and `@radix-ui/react-icons` are optional peer dependencies used only by these
    widgets.
  - New `config-types` subpath export: TS utility types that derive entry shapes from a const-asserted
    Decap config.
  - Expired sessions now show a blocking re-auth overlay instead of logging out, so unsaved work
    survives an expired access token. The auth reducer is an RTK slice with a `sessionExpired` action
    driven by a session listener middleware; transient auth failures no longer destroy the stored
    session, only a definitive backend rejection does.

  Dependency changes for consumers:

  - The github and gitlab GraphQL backends now use `@apollo/client` v4: the optional
    `apollo-cache-inmemory`, `apollo-client`, `apollo-link-context` and `apollo-link-http` peer
    dependencies are replaced by a single optional `@apollo/client` peer dependency.
  - The unused `./default-exports`, `./editor-component-image` and `./editor-component-embedded-entry`
    subpath exports are removed; their source modules were already deleted.

  Fixes:

  - The colorstring widget parses colors again (named colors, `rgb()`/`rgba()`, short hex) via a small
    local parser, restoring the pre-4.0 normalization behavior that was lost when `tinycolor2` was
    dropped: with `enableAlpha` the picker works in rgba space and fully opaque colors are stored as
    short hex.
  - Nested-collection breadcrumbs in the Laika shell now follow the tree path: every ancestor folder
    is a crumb linking to its `/collections/<name>/filter/<path>` view instead of the breadcrumb
    always pointing straight back at the dashboard. The `renderCollectionTop` slot receives the new
    `filterTerm` render prop.
  - Local entry backups can no longer be lost by a misclick: leaving an entry flushes the pending
    backup write instead of deleting it, and declining the restore prompt keeps the backup. Backups
    are only removed by a successful persist, publish, or delete.
  - Richtext: `portableTextToLexical` maps the reserved image and horizontal-rule blocks (DCMS-1183),
    and the hr transformer no longer sets the `isImport` flag (DCMS-1192).

  Internal changes:

  - Lucide icons are vendored under `ui/icons` and TopBarProgress is a local primitive, so
    `lucide-react` and `react-topbar-progress-indicator` are no longer runtime dependencies. The
    `fuzzy` package is replaced by a local matcher and the dev server logs via `console` instead of
    `winston`.
  - The dead `default-exports` and `editor-component-image` modules are removed, along with the
    `DECAP_CMS_*_VERSION` console banner and window version globals.
  - The e2e suite finished migrating from Cypress to Playwright.

- a61641b: Replace the legacy Apollo GraphQL stack with `@apollo/client` v4.

  The GitHub and GitLab GraphQL backends (`use_graphql: true`) now use `@apollo/client` v4 instead of
  the deprecated `apollo-client` 2.x packages (`apollo-client`, `apollo-cache-inmemory`,
  `apollo-link-http`, `apollo-link-context`). Behavior is unchanged: same queries, fetch policies, and
  cache updates, with the v4 client configured not to send Apollo's client-awareness telemetry
  extension to Git hosts.

  **Migration (only if you use `use_graphql: true`):** swap the optional peer dependencies:

  ```sh
  pnpm remove apollo-client apollo-cache-inmemory apollo-link-http apollo-link-context
  pnpm add @apollo/client rxjs
  ```

  `graphql` and `graphql-tag` remain optional peers; `rxjs` is required by `@apollo/client` v4.

## 4.0.4-alpha.3

### Patch Changes

- 85416b2: laika backend: silently refresh expired access tokens via the OAuth refresh grant.

  The backend now stores the full token triple (access token, refresh token, expiry) and `tokenPromise` re-evaluates expiry on every call, refreshing single-flight through the token endpoint (the server rotates the pair on refresh). An unrecoverably dead session is reported through the new `ImplementationInitOptions.onSessionExpired` callback, exposed as `Backend.onSessionExpired(listener)` and wired by the app shell to a logout — the user gets the login screen instead of stale-session 401s rendered as not-found pages. `currentBackend` is now exported from `./core` so host apps can obtain refresh-aware tokens via `getToken()` instead of reading stored tokens directly.

## 4.0.4-alpha.2

### Patch Changes

- 304bca9: Keyboard shortcuts, paginated media library, richtext table paste, and auth/i18n/dnd fixes.

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

## 4.0.3-alpha.0

### Patch Changes

- Workspace restructure, upstream fleet fixes, and new content-format infrastructure.

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
  - Responsive fixes on mobile viewports: collection sidebar, editor split pane, media library
    modal and card grid (DCMS-641/642/643).
  - Richtext: pasted image `src` sanitization, beacon leak stopped for allowed-protocol pasted
    images, `OverflowNode` content included in serialized output (DCMS-636/639/640).
  - Relation and select widgets portal their menus to `document.body` so options are not
    overlaid by sibling fields (DCMS-U-0716a).
  - `PkceAuthenticator` now fails fast when `base_url` is missing, matching documented
    behavior (DCMS-647).

  The repository itself is now a pnpm workspace: the package moved from the repo root to
  `packages/decap-cms` with no change to the published package layout.

Releases of `@laikacms/decap-cms` are documented on the GitHub
[Releases](https://github.com/laikacms/decap-cms/releases) page.

This package is a fork of Decap CMS. Pre-fork history lives in the per-package changelogs of
the [upstream repository](https://github.com/decaporg/decap-cms), where each former
`decap-cms-*` package keeps its own CHANGELOG.md.

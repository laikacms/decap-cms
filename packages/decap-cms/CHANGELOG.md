# Changelog

## 4.2.0

### Minor Changes

- d094b7e: Add a tree-shakeable `@laikacms/decap-cms/app/bare` entry point for the classic
  (non-laika) app shell, mirroring `@laikacms/decap-cms/laika-app/bare`. Like the
  laika bare entry, it exposes the same public API as `/app` but skips the eager
  `registerExtensions()` and the auto-init at module load, so consumers can
  register only the backends/widgets/entry-codecs they use and let the bundler
  tree-shake the rest. `./app/bare` is now tracked in the bundle-size badge
  (`.github/bundle-size.json`).
- 72ef4c7: Every bundled backend now returns entries as `BackendEntry`. GitHub, GitLab, Gitea, Forgejo,
  Bitbucket, Azure, Git Gateway, proxy, local FS and the test backend carry raw file text as
  `rawContent(text)`; the Laika backend hands its stored documents over as `parsedContent(data)`, so
  structured content no longer makes a round trip through JSON just for the engine to parse it back.
  File authorship crosses the seam as an `Author` object rather than a bare name string, and the
  display label is no longer echoed back (it comes from collection config).

  The shared `entriesByFolder` / `entriesByFiles` / `allEntriesByFolder` helpers exported from
  `@laikacms/decap-cms/lib/backend` return `BackendEntry[]` as a result.

  A commit that names nobody now yields no author at all, rather than an author whose name is the
  empty string. The shared helpers already worked this way; GitLab's GraphQL read path did not, and
  now matches.

  **Breaking:** `{ data: string, file }` is no longer accepted anywhere, and the
  `CmsImplementationEntry` type is removed. A custom backend must return `content: rawContent(text)`
  (file storage) or `content: parsedContent(data)` (document storage) from `getEntry`,
  `entriesByFolder`, `entriesByFiles`, `allEntriesByFolder` and `traverseCursor`. File authorship is
  `file.author?: Author` rather than a name string, and `file.label` is no longer read.

- 19c3d5a: Update the `laikacms` dependency from `^2.0.0` to `^3.1.0`, used by the `laika` backend and the
  laika app shell.
- bb91e4c: Ship prebuilt CDN bundles for the two full app shells. `pnpm build:cdn` (run by `prepack`) emits
  `dist/cdn/decap-cms.js` and `dist/cdn/laika-cms.js` as self-contained minified IIFE bundles exposing
  `DecapCms` / `LaikaCms` globals, plus `*.esm.js` siblings for `<script type="module">`. Everything
  is inlined, so unpkg and jsdelivr serve a working CMS off a single URL with no bundler and no peer
  installs. The `unpkg`/`jsdelivr` fields point at the classic bundle. These are raw tarball paths,
  not subpath exports, so `package.json#exports` is unchanged.

  Only the full `app` and `laika-app` entries get a CDN build: the `bare` entries exist so a bundler
  can tree-shake, which a prebuilt script tag cannot do.

- 55fb7c8: Add path, validation and diff helpers for the in-CMS config editor, groundwork for editing
  `config.yml` from inside the CMS.
- d094b7e: Deprecate the `ai-chat` widget. It was a client-side stopgap for AI-assisted editing of an open
  entry, which the server-side laikacms MCP (`/mcp`) cannot reach because it has no access to the
  editor's client-side draft state. The widget remains fully functional and its `ai`/`ai/*` server
  adapter (also used by the AI-translate editor feature) is unchanged, but `DecapCmsWidgetAiChat.Widget()`
  now logs a one-time deprecation warning on registration and the exports carry `@deprecated` JSDoc.
  Prefer the MCP integration for AI-assisted editing; the widget will be removed once a client bridge
  lets MCP edit an open entry.
- 1a1853f: The engine now reads entries through the `BackendEntry` seam. A backend may return an entry whose
  `content` is `rawContent(text)` or `parsedContent(data)` instead of the old `data: string` field,
  and structured content is carried into the entry by reference: no parse round trip, and no
  registered entry codec needed. Backends returning the old shape keep working unchanged, so
  implementations can move over one at a time.
- e991f66: Drop the `laika` backend's tolerance for pre-3.1 `laikacms` repositories. The content-sync surface
  (`getSyncToken` / `listChanges`), the per-record `version` token, and the documents/assets capability
  documents are now read through their declared types instead of structural probes; change support is
  gated on `getCapabilities().changes` alone. Injecting a `DocumentsRepository` built against an older
  `laikacms` is no longer supported.
- 2e8f194: Implement server-arbitrated entry locking in the `laika` backend.

  `LaikaBackend` now implements the four optional `CmsImplementation` lock methods
  (`getEntryLock`/`acquireEntryLock`/`releaseEntryLock`/`refreshEntryLock`) against
  `@laikacms/server/api`'s `/locks` endpoint, which is itself an adapter over the documents
  repository's lock methods (ADR-007 in the `laikacms` repo). Two editors on different browsers now
  see the same "Being edited by X" banner; previously the only implementation was `EntryLockManager`,
  which shares locks between tabs of one browser and cannot arbitrate between users.

  The client keeps the opaque lock token returned by acquire and replays it on refresh and release,
  since the server authorises on the token rather than on identity. Tokens are dropped on `logout()`.
  The owner is never sent: the server derives it from the authenticated principal, so a client cannot
  take a lock as someone else.

  Degradation is explicit: a `423` rejects so core raises the conflict banner, while a `501` (backend
  cannot lock) or a transport failure resolves `null` so the editor hides the lock UI instead of
  false-alarming a conflict or blocking the edit.

  `CmsImplementation.acquireEntryLock` and `refreshEntryLock` are now typed
  `Promise<CmsEntryLock | null>` rather than `Promise<CmsEntryLock>`. `Backend` already returned
  `| null` and core already treated `null` as ENTRY_LOCK_UNSUPPORTED; the implementation signature was
  the only place that claimed otherwise, which forced implementors into a cast to degrade.

- 6f3b573: Add two public subpath exports: `@laikacms/decap-cms/lib/domain` (the domain entry types and
  factories, importable with zero dependencies) and `@laikacms/decap-cms/lib/backend` (the backend
  contract, the `BackendEntry` seam with its tagged `raw`/`parsed` content union, `PersistPayload`,
  `UnpublishedEntry`, and the implementer helpers). Nothing consumes them yet: the engine and the
  shipped backends still run on `CmsImplementation`, so this release changes no behavior.
- 55fb7c8: Add a `local-fs` backend for local-first editing via the File System Access API (Chromium only).
  Pick a directory once and edit content straight on disk, no proxy server needed; the picked
  directory handle is persisted in IndexedDB across reloads. Config validation rejects the
  unsupported `local-fs` + `editorial_workflow` combination at config time, and cancelling the folder
  picker is a no-op instead of surfacing an AbortError.
- 55fb7c8: Add personal access token (PAT) login for the git backends. The login screen for github, gitlab,
  gitea, bitbucket and azure now offers a token form next to OAuth, so a backend works without an
  OAuth app or auth server. The entered token is preserved across a failed login attempt instead of
  clearing the field.
- 55fb7c8: Add QR code login to the laika app shell: scan a code from an authenticated desktop session to log
  in on a mobile device without retyping credentials.
- 5977754: Add `resolveLaikaBackend({ local, remote })` to `@laikacms/decap-cms/backends/laika`, which picks
  the Decap `backend:` block for the current build: the local JSON:API that `@laikacms/vite-plugin`
  mounts while `vite dev` runs, and the remote OAuth backend everywhere else. One admin config now
  targets both without manual switching.

  Selection reads `import.meta.env.DEV`, and fails safe to `remote` whenever that flag is not truthy,
  so a production build, a standalone admin or `vite preview` never targets a phantom local endpoint.
  Local mode therefore only engages when the admin config itself is bundled by Vite. Tests can pass
  `dev` explicitly to exercise both branches.

  `DEFAULT_LOCAL_BACKEND_BASE_PATH` (`/__laika`) and `DEFAULT_LOCAL_BACKEND_DEV_TOKEN` are exported
  alongside it; `createLaikaBackend` and `DevAuthenticationPage` stay public, so hand-wiring a custom
  local/remote arrangement instead of using the helper is still possible.

### Patch Changes

- 55fb7c8: Accessibility fixes: `Collapsible.Trigger` keeps `aria-controls` set while closed, and the
  restore-backup dialog is no longer inert when it opens.
- c97c860: Fix two ways a backend could attribute an entry to the wrong thing.

  GitLab's GraphQL read path fetched file content and authorship as two independently batched queries
  and joined both back to the requested files by array index. Neither response is positionally
  reliable: GitLab omits blobs for paths it cannot resolve, and a tree can report a null `lastCommit`.
  Either one shifted every later file onto its predecessor's content or author. Both halves are now
  keyed by path, which means the `blobs` query also selects `path`. A file GitLab returns no blob for
  is reported as empty and warned about, rather than silently taking the next file's content.

  The AWS Cognito GitHub proxy backend derived the acting account from the second segment of
  `backend.repo`, so it reported the repository name where a GitHub login belongs (and built an avatar
  URL, `github.com/<name>.png`, that only resolves for an account). It now uses the repo's owner.

- 55fb7c8: Restore the "Back to home" link on the collection not-found page in the classic app shell.
- 55fb7c8: Fix `config.schema.json`: pin the `sortableFields` alias alongside `sortable_fields`, and remove
  the nonexistent `icon-picker` value from the widget enum (the shipped widgets are `lucide-icon` and
  `radix-icon`).
- 55fb7c8: Log the underlying error when loading unpublished entries fails in the editorial workflow, instead
  of failing silently.
- 5d1b447: Turn on `exactOptionalPropertyTypes` and adjust the type surface accordingly.
  Optional properties that may legitimately carry an explicit `undefined` (backend
  payload shapes like `CmsUser` and `MediaFile`, callee-defaulted option bags, and
  React props forwarded through JSX) are now declared `?: T | undefined`;
  properties that are genuinely absent stay `?:` and are built by omission.
  Consumers compiling against these types with `exactOptionalPropertyTypes` off
  are unaffected.
- 55fb7c8: Scope the richtext editor's image `DRAGSTART_COMMAND` preventDefault workaround to Firefox only,
  restoring native image drag behavior in other browsers.
- 55fb7c8: git-gateway: log Netlify deploy-preview fallback errors instead of swallowing them, and remove a
  stale gotrue-js logout workaround.
- 55fb7c8: Add the missing `editor.editorToolbar.publishChanges` i18n key in the laika app shell.
- 55fb7c8: Purge local-draft backup entries on logout. Previously `Backend.logout()` left
  `decap-cms:backup*` entries in localForage, so on a shared workstation the next user could get a
  "Restore backup" prompt that hydrated the previous user's unsaved draft content. Logout now always
  drops local drafts; reload-restore for a still-logged-in user is unaffected.
- 55fb7c8: Warn in the console when no locale is registered instead of failing silently, which mainly bites
  custom builds assembled from the bare entry points.
- 55fb7c8: Declare the shadcn popover CSS tokens at the app root instead of only inside the editor, fixing
  unstyled popovers rendered outside the editor tree.
- a093ecf: Never open a search projection for editing. Entries coming from a search index carry only the fields
  that index stores, and a search result overwrites the cached entry for that slug, so an entry could
  be fresh in the store and still be a projection. Opening one for editing would save it back over the
  real entry, dropping every field the index does not keep. Such entries are now marked `projected`
  (replacing the unenforced `partial` flag the Algolia integration set), everything that opens a draft
  requires a complete entry at the type level, and a cached projection is refetched instead.
- 55fb7c8: Reject a `proxy` backend config without `proxy_url` at config time instead of failing later at
  runtime.
- 55fb7c8: Tighten widget config validation: the boolean widget now has a config schema, and the file/image
  widget schemas validate their `media_library` config instead of accepting anything.
- 55fb7c8: A required list field now fails validation when its value is empty, matching the behavior of the
  other widgets.

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

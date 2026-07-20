---
'@laikacms/decap-cms': patch
---

AI chat widget, icon picker widgets, config-derived entry types, session re-auth overlay, and safer
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

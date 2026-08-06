# Local FS backend

A backend that reads and writes the content repository directly on disk in the browser, via the
[File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API)
(`showDirectoryPicker()`). No proxy server or git host is involved — this is decap-cms's answer to
Sveltia CMS's "Local-First" editing mode (DCMS-1399).

## Browser support

The File System Access API's directory-picker + permission-query surface is Chromium-only today
(Chrome, Edge, Opera, ...); Firefox and Safari don't implement it. `isLocalFsSupported()` (exported
from `index.ts`) feature-detects `window.showDirectoryPicker`. Today it has exactly one runtime
caller — the `LocalFsBackend` constructor itself — which throws a `ConfigurationError` when it
returns `false`, rather than falling back to another backend. Nothing pre-checks
`isLocalFsSupported()` before offering `local-fs` as a config choice, so configs that select it
unconditionally will surface that thrown error (not a graceful fallback) on unsupported browsers.
If your config needs to work on Firefox/Safari too, select the `proxy` backend (which needs a
running
[`decap-server`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-server)-style
process but works everywhere) there instead, or call `isLocalFsSupported()` yourself before
deciding which backend to configure.

## Code structure

`implementation.tsx` - `LocalFsBackend`, a `CmsImplementation` that reads/writes files directly
against a `FileSystemDirectoryHandle` using the helpers in `fsUtils.ts`.

`fsUtils.ts` - Path-based helpers (`readFileAsString`, `writeFile`, `listFiles`, `deleteEntry`, ...)
that do the segment-by-segment `getDirectoryHandle`/`getFileHandle` traversal the File System Access
API requires, so `implementation.tsx` can work with `/`-separated repo-relative paths like every
other backend.

`directoryHandleStore.ts` - Persists the picked `FileSystemDirectoryHandle` in IndexedDB directly
(not through `@/lib/util/localForage`, which is a `localStorage` + `JSON.stringify` shim and can't
hold a non-JSON handle object) so the same folder can be reconnected in a later session.

`types.ts` - Ambient type declarations for the parts of the File System Access API
(`showDirectoryPicker`, `requestPermission`/`queryPermission`) that are still missing from
TypeScript's bundled `lib.dom.d.ts`.

`AuthenticationPage.tsx` - The "login" screen; clicking its button is the user gesture that both
`showDirectoryPicker()` and the permission re-grant require, so authentication can only start from
here (see `restoreUser` below).

## Session re-grant

A `FileSystemDirectoryHandle` persists in IndexedDB across sessions, but the browser still requires
an explicit permission grant — driven by a user gesture — before it can be read from again after a
reload. `restoreUser()` reconnects a handle only when the browser still considers permission granted
(e.g. still-fresh state within the same tab); otherwise it rejects so the app falls back to
`authComponent`, whose button click supplies the gesture `requestPermission()` needs.

## Editorial workflow

Out of scope for this first pass: there's no git/PR layer under this backend to stage unpublished
drafts against, so the `unpublishedEntry*`/`publishUnpublishedEntry`/`updateUnpublishedEntryStatus`
methods reject. `publish_mode: simple` (the default) never calls them.

`validateConfig()` rejects `backend.name: local-fs` combined with `publish_mode:
editorial_workflow` at config-load time (DCMS-1860), so the unsupported combo is caught before the
user picks a directory and grants permission, rather than surfacing as a runtime
`EditorialWorkflowError` later. Use `publish_mode: simple` (or omit `publish_mode`, which defaults
to it) with this backend.

## `backend:` config keys

None beyond the standard `name: local-fs`. `media_folder` is read the same way the `proxy` backend
reads it (top-level config key, defaults to `''`).

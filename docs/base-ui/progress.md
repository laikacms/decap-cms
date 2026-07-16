# Progress

Status: rejected

Base UI's Progress (`@base-ui/react/progress`) renders an accessible progress bar from five parts:
`Root` (owns the `progressbar` semantics and `aria-valuenow`), `Track`, `Indicator`, `Label`, and
`Value` (Intl-formatted). `value={null}` gives an indeterminate state, and `data-progressing` /
`data-complete` / `data-indeterminate` attributes drive styling. Its purpose is communicating task
completion, ideally with a real numeric value.

## Current state in this repo

There are zero imports of `@base-ui/react/progress`, and, more importantly, there is no determinate
progress value anywhere in the app to feed one:

- All loading UI is indeterminate. The classic shell uses `Loader` from `src/ui/default/Loader.tsx`,
  a spinner with an animated rotating-text carousel (used by `src/app/components/App.tsx`,
  `src/core/components/Collection/Entries/Entries.tsx`, `src/core/components/Editor/Editor.tsx`,
  `src/core/components/Workflow/Workflow.tsx`, and both MediaLibraryTop variants). The Laika shell
  has `LaikaLoader` (`src/laika-app/LaikaLoader.tsx:57`), which already renders `role="status"`
  `aria-live="polite"`.
- Media uploads expose only a boolean: `isPersisting`
  (`src/core/components/MediaLibrary/MediaLibrary.tsx:75,114`) toggled around `persistMedia`; the
  backend interface (`src/core/backend.tsx`) has no byte-level or percentage progress callback, and
  none of the git backends in `src/backends/` surfaces one (uploads are single fetch/XHR calls
  without progress events plumbed through).
- Auth pages track a boolean `inProgress`/login-pending state, again with no numeric progression.

## Why not adopt

A progress bar without a value is just a spinner with extra parts. Wiring Base UI Progress in
`value={null}` mode would restyle the existing loaders without adding information or accessibility
(LaikaLoader already announces via `role="status"`; porting that attribute to the classic `Loader`
is a one-line fix that needs no library). The genuinely useful adoption, real upload progress in the
media library, is blocked on backend plumbing, not on a UI primitive: `persistMedia` would first
need an `onProgress` channel from the backend implementations up through the Redux action.

Revisit when (if) backend media uploads gain progress events, for example for large files via LFS or
resumable uploads. At that point `Progress.Root/Track/Indicator` in the media library dialog and
`LaikaMediaLibraryTop` is the right primitive, and the indeterminate fallback (`value={null}`)
covers backends that cannot report progress.

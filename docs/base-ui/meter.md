# Meter

Status: rejected

Base UI's Meter (`@base-ui/react/meter`) is a graphical display of a numeric value within a known
range: `Root` (with required `value`, plus `min`/`max`, Intl `format`/`locale`, and
`aria-valuenow`/`aria-valuemin`/`aria-valuemax` semantics), `Label`, `Track`, `Indicator`, and
`Value`. Unlike Progress it represents a static measurement (disk usage, quota, signal strength,
password strength), not a task moving toward completion.

## Current state in this repo

There are zero imports of `@base-ui/react/meter`, and no UI in the codebase displays a bounded
measurement at all:

- No `role="meter"`, `<meter>`, or gauge-like component exists anywhere in `src/`.
- No storage or quota display: the media library (`src/core/components/MediaLibrary/`,
  `src/laika-app/LaikaMediaLibraryCard.tsx`) lists assets but none of the backends (`src/backends/`)
  exposes storage-quota or rate-limit data that could be visualized.
- No strength/score indicators: there are no password fields (auth is OAuth/token based, see
  `src/ui/auth/` and the backend AuthenticationPages) and no scoring UI.
- The only "quota" hit in the codebase is a comment about localStorage quota errors in
  `src/laika-app/LaikaThemeContext.tsx:48`, which is error handling, not a display.

## Why not adopt

There is simply nothing to meter. Adopting the component would mean inventing a feature (for example
a storage-usage gauge) rather than improving existing code, and no backend currently supplies the
data such a feature would need. If a bounded-measurement display ever lands (say, API rate-limit
remaining for the GitHub backend, or media storage usage for a hosting integration), Base UI Meter
is the correct primitive and would slot into `src/ui` alongside the other Base UI-backed components,
but speculatively wrapping it now would only add dead code to the design system.

---
name: base-ui
description: Fetch live Base UI (@base-ui/react) documentation from base-ui.com. Base UI is the styling-agnostic, accessible React component library this repo builds its UI primitives on. Use when working with Base UI components, their props/APIs, composition (render prop), accessibility patterns, or when adding or modifying components in src/ui.
---

# Base UI docs

This repo's UI primitives (`src/ui`) are built on `@base-ui/react`: unstyled, composable,
accessible React components. Every doc page on base-ui.com is published as markdown, and
this skill's script fetches them live, so the content always matches the current release.

## Usage

All commands are relative to this skill's base directory.

List every doc page (path, title, one-line summary), optionally filtered:

```bash
scripts/docs.sh list
scripts/docs.sh list menu
```

Fetch one or more pages by leaf name or full path:

```bash
scripts/docs.sh get menu
scripts/docs.sh get select tooltip use-render
scripts/docs.sh get handbook/styling
```

## Sections

- `components/*`: one page per component (accordion, dialog, menu, popover, select,
  toast, tooltip, ...) with full API tables, parts, and accessibility notes.
- `utils/*`: `merge-props`, `use-render`, `direction-provider`, `csp-provider`.
- `handbook/*`: cross-cutting guides (styling, composition via the `render` prop,
  animation, forms, migrating from Radix).
- `overview/*`: quick start, accessibility, releases/changelogs.

## Tips

- Component pages are large (50-180KB). Fetch only the components you are working on,
  and prefer `handbook/composition` when the question is about the `render` prop pattern
  rather than a specific component.
- Before relying on a prop or part name in this codebase, confirm it against the fetched
  page for the installed version (`@base-ui/react` in `package.json`); check
  `overview/releases` when something seems to have changed between versions.
- If a bare name is ambiguous the script prints the candidate paths; rerun with the
  full path (for example `get components/menu`).

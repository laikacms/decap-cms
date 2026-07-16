# Preview Card

Status: rejected

Base UI's Preview Card (`@base-ui/react/preview-card`) is a hovercard: a rich popup that opens when
the user hovers or focuses a link, previewing its destination (the GitHub profile-hover pattern).
Parts in the installed 1.6.0: `PreviewCard.Root`, `Trigger`, `Portal`, `Positioner`, `Popup`,
`Arrow`, `Backdrop`, `Viewport`, plus a detached `createHandle` API
(`node_modules/@base-ui/react/preview-card/index.parts.d.ts`). It is explicitly a supplementary,
pointer-oriented affordance; the docs note the content should remain reachable by other means since
hover previews do not translate to touch or screen readers.

## Current state in this repo

There are zero imports of `@base-ui/react/preview-card`, and an audit found no hand-rolled
hover-preview UI anywhere to replace: no hovercards over links, entries, authors, or media. Hover
feedback in the CMS today is limited to plain tooltips (`docs/base-ui/tooltip.md`) and CSS hover
styling on cards and rows.

## Motivation for rejection

- No existing code duplicates this primitive, so there is nothing to simplify by adopting it;
  adoption would mean inventing new UX, which is a product decision rather than a refactor.
- The candidate surfaces were considered and none earns a hovercard right now:
  - Relation widget (`src/widgets/relation`): previewing the referenced entry on hover would require
    fetching entry data per hover; the widget's search results already show the configured
    `display_fields`, so the marginal value is low and the async cost real.
  - Collection lists and workflow cards: the card itself already is the preview (title, summary,
    image); hovering it navigates nowhere new.
  - Links inside the richtext editor: hover UX there is Lexical's floating link editor territory,
    and the CMS edits mostly relative/internal URLs where a destination preview cannot be rendered
    meaningfully or safely (fetching arbitrary external URLs for previews from an editor context
    raises CSP/privacy questions).
- Mobile is a first-class target for the Laika shell (`src/laika-app` has a dedicated mobile drawer
  and command palette); a hover-only affordance adds desktop-only surface area that would then need
  touch fallbacks to stay consistent.

If a hover preview ever becomes a designed feature (e.g. entry hovercards on the Laika dashboard
backed by already-loaded Redux entities, which would avoid the fetch-per-hover problem), this
primitive is the right building block and the adoption pattern should mirror `LaikaTooltip`: a small
`laika-app/ui` wrapper over the raw parts.

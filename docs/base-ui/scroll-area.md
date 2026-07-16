# Scroll Area

Status: rejected

Base UI's Scroll Area (`@base-ui/react/scroll-area`) replaces native scrollbars with fully custom
ones while keeping native scroll mechanics. It is a six-part composition: `Root`, `Viewport`,
`Content`, `Scrollbar` (per orientation), `Thumb`, and `Corner`, with styling hooks like
`data-scrolling`, `data-hovering`, overflow-edge data attributes, and CSS variables for thumb sizing
and fade masks. Its value is a consistent, overlay-style, brandable scrollbar across platforms.

## Current state in this repo

There are zero imports of `@base-ui/react/scroll-area`. The local primitive is a thin native-scroll
wrapper:

- `src/ui/ScrollArea.tsx:32-47`: a single `<div>` with `overflow: auto` plus scrollbar theming via
  standard CSS (`scrollbar-color`/`scrollbar-width: thin`, lines 13-24, with a `::-webkit-scrollbar`
  fallback). No JS behavior at all.
- `src/ui/ScrollArea.tsx:26-30`: `ScrollBar` is a deliberate no-op that returns `null`, kept only so
  shadcn-shaped call sites compile. Both are exported from `src/ui/index.ts:16`.

The consumer surface is exactly one file:
`src/ui/editor/plugins/actions/TreeViewPlugin.tsx:8,25-36`, the richtext editor's debug tree viewer,
which renders the Lexical `TreeView` inside a fixed-height `ScrollArea`. Everything else in the app
scrolls with plain `overflow` CSS on containers.

## Why not adopt

- Native scrolling is the accessibility and behavior baseline: wheel, touch, keyboard (arrows,
  PageUp/Down, Home/End when focused), and platform conventions all work with no JS. Base UI keeps
  native mechanics too, but the migration would still swap one styled div for a five-element
  structure (Root/Viewport/Content/Scrollbar/Thumb) plus new scrollbar styling, purely for
  cosmetics.
- The only call site is a developer-facing debug panel; there is no product surface where custom
  overlay scrollbars are a design requirement today.
- The current implementation already achieves the design goal (thin, theme-colored scrollbars) with
  two standard CSS properties; `scrollbar-color`/`scrollbar-width` are supported in all evergreen
  browsers this project targets.

Revisit if the Laika shell's design language later calls for overlay (macOS-style) scrollbars on
dashboard lists or the sidebar regardless of platform; that is the case Base UI Scroll Area is built
for, and the swap could then happen inside `src/ui/ScrollArea.tsx` behind the existing export
(giving the stub `ScrollBar` a real meaning again).

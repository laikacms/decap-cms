# useRender

Status: rejected

Base UI's `useRender` (`@base-ui/react/use-render`) is a hook for building your own components that
support Base UI's `render` prop convention. You give it a `defaultTagName`, the consumer's `render`
value (element or callback), `props` to spread, optional `state` (surfaced to callbacks and mapped
to `data-*` attributes via `stateAttributesMapping`), `ref`(s) to merge, and an `enabled` flag; it
returns the rendered element. It is the tool for making a from-scratch primitive polymorphic in the
same way Base UI's own parts are, and pairs with `mergeProps` for prop merging inside it.

## Findings

The repo never builds render-prop support from scratch; it only consumes the `render` prop that Base
UI parts already implement:

- `src/ui/Dialog.tsx:39-50,56-67`: `DialogTrigger` / `DialogClose` expose a Radix-style `asChild`
  API and implement it by forwarding the child element to `DialogPrimitive.Trigger` / `.Close`'s own
  `render` prop. This is a thin compat shim over Base UI's existing mechanism, not a
  reimplementation; `useRender` would add nothing.
- `src/laika-app/ui/LaikaTooltip.tsx:45` and the editor toolbar/action plugins
  (`src/ui/editor/plugins/toolbar/`, `src/ui/editor/plugins/actions/`) pass elements to the `render`
  prop of Base UI parts; again the primitive does the work.
- The primitives that are not Base UI-backed have no polymorphism requirement:
  `src/ui/ScrollArea.tsx:32-47` is a plain styled `div`; the color picker
  (`src/ui/editor/editor-ui/ColorPicker.tsx:50-52`) is an explicit stub whose `asChild` prop is a
  no-op placeholder until the real picker lands. No consumer in `src/`, `src/widgets` or
  `src/laika-app` asks any local primitive to render as a different element.

## Motivation

`useRender` exists for component-library authors adding the render-prop feature to new primitives.
This repo's `src/ui` layer is a styling veneer over Base UI: where element substitution is needed,
the underlying Base UI part already provides `render`, and where it is not provided, nobody needs
it. Adopting `useRender` today would mean adding speculative API surface (render props on `Toggle`,
`ScrollArea`, buttons) with zero call sites, which contradicts keeping the local primitive set
minimal.

## When to reach for it

Two concrete future triggers:

- Rebuilding the full color picker (`ColorPicker.tsx` notes the original was ~1900 lines of custom
  UI): if its trigger/swatch parts should honor `asChild`/`render` like the rest of the design
  system, implement them with `useRender` + `mergeProps` rather than manual `React.cloneElement`
  plumbing.
- If a local, non-Base-UI primitive ever needs to render as a caller-supplied element (for example a
  `Button` that must render as the router's `Link` from `src/core/routing/Link.tsx`), `useRender` is
  the sanctioned way to do it consistently with the Base UI parts around it.

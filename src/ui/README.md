# `src/ui/` — in-house primitive library

`src/ui/` is the canonical, shadcn/ui-style home for every interactive UI
primitive in this codebase. It is adapted to our stack:

- **Behavior**: [Base UI](https://base-ui.com) (`@base-ui/react`) for
  anything interactive — dialogs, menus, popovers, selects, toggles, tabs,
  tooltips. Wrap Base UI parts rather than inventing new behavior. Note:
  as of #635 most existing wrappers under `src/lib/widgets/editor/ui/`
  still use their pre-migration implementation (`react-modal`,
  `react-aria-menubutton`, etc.) — #627-#632 are the phases that swap each
  one onto Base UI.
- **Styling**: [Emotion](https://emotion.sh) — the `css` prop / `styled` API
  and the `variants` cva-style helper in [`styled.ts`](./styled.ts). No
  Tailwind, no CSS Modules.
- **Convention**: same shape as shadcn/ui — primitives are copied/vendored
  into the repo, not pulled in as an opaque component-library dependency.
  You own the file, you can change it.

Tracked by #635 (DCMS-548), part of the Base UI migration tracked in #626
(DCMS-540).

## Folder layout

Each primitive is a flat file directly under `src/ui/`:

```
src/ui/<primitive>.tsx              # the primitive itself
src/ui/<primitive>.stories.tsx      # Storybook stories (sibling, optional but expected)
src/ui/__tests__/<primitive>.spec.tsx  # behavior tests (sibling __tests__ dir)
```

- One primitive per file. Compound primitives (e.g. `Dialog` +
  `DialogTrigger` + `DialogContent` + `DialogTitle`) live together in the
  same file — that's one primitive, several parts.
- No default exports (repo-wide convention — see `skills/typescript`).
  Export every part by name.
- `.tsx` for anything that renders JSX; `.ts` for pure styling/type helpers
  (e.g. `styled.ts`).

## Styling contract

- Use the `css` / `cx` / `keyframes` re-exports from
  [`./styled.ts`](./styled.ts) (backed by `@emotion/css`), or the
  `@emotion/react` `css` prop directly. Don't reach for `styled-components`
  or inline `style={{}}` for anything variant-driven.
- Use the `variants()` helper for `class-variance-authority`-shaped variant
  props (see any existing primitive, e.g. `button.ts`'s `buttonVariants`,
  for the pattern). It mirrors `cva` closely enough that porting a shadcn/ui
  primitive is a near-mechanical find/replace of `cva` → `variants` and
  `cn` → `cx`.
- Pull colors, spacing, typography from the existing theme tokens (see
  `src/ui/default/styles.tsx`) rather than hardcoding values. This is a
  **styling contract, not a restyle** — when porting an existing wrapper
  from `src/lib/widgets/editor/ui/`, its current Emotion output must stay
  pixel-identical.

## How to add a new primitive

Pick one:

1. **Base UI wrap** (preferred). Import the Base UI part(s) from
   `@base-ui/react/<part>`, layer Emotion styling via `render`/
   `className`, expose a small typed API. This is the target shape for
   every wrapper under `src/lib/widgets/editor/ui/` (soon to move here) —
   see #626/#627-#632 for the per-primitive migration and copy the pattern
   from whichever has already landed.
2. **Vendor**. If upstream (Base UI or elsewhere) doesn't cover the
   behavior, or the reference implementation is small/single-file/
   unmaintained, copy the source into `src/ui/<primitive>.tsx` and adapt it
   to our styling contract. Note the origin (repo + commit/version) in a
   comment at the top of the file.
3. **CSS-only**. Purely presentational primitives with no interactive
   behavior (e.g. a `Separator`) don't need Base UI at all — a styled
   native element is enough.

In all three cases: add the file, add stories if the primitive has more
than one visual state worth demonstrating, add a spec covering the
behavior contract (keyboard interaction, ARIA attributes, controlled/
uncontrolled state), then export it from [`index.ts`](./index.ts).

## Re-export policy

[`index.ts`](./index.ts) is the only barrel. It does `export * from
'./<primitive>'` for every primitive file — no default export, no
re-grouping into a namespace object. Consumers import by name:

```ts
import { Dialog, DialogContent, DialogTrigger } from '@/ui';
```

`src/ui/default/` and `src/ui/auth/` are separate, pre-existing subtrees
(presentational legacy components and auth screens — see #626's
non-goals) and are **not** re-exported through `index.ts`; they keep their
own `./ui/default` / `./ui/auth` package export subpaths.

## Current inventory and migration status

Every primitive currently listed below is a **thin re-export**, not yet a
physical move:

```ts
// src/ui/dialog.ts
export * from '@/lib/widgets/editor/ui/dialog';
```

The implementation still lives at `src/lib/widgets/editor/ui/<name>.tsx`.
This was a deliberate choice for #635/DCMS-548 (a foundation-only issue):

- **Zero blast radius.** No consumer import changes, no risk of breaking
  the in-progress Base UI migration (#627-#632) which is actively editing
  those files.
- **`src/ui/` becomes the canonical import path immediately** — new code
  should `import { Button } from '@/ui'`, not reach into
  `src/lib/widgets/editor/ui/` directly — without a risky mass `git mv`.
- **Physical move happens per-phase.** Each of #627-#632 lifts the
  primitive(s) it touches (file + `.stories.tsx` + `__tests__/*.spec.tsx`)
  from `src/lib/widgets/editor/ui/` into `src/ui/` as part of that phase's
  PR, and turns the corresponding `src/ui/<name>.ts` re-export into the
  real file. Once every phase lands, `src/lib/widgets/editor/ui/` should be
  empty and can be deleted.

Primitives re-exported today: `button`, `button-group`, `checkbox`,
`command`, `dialog`, `dropdown-menu`, `field`, `input`, `label`, `popover`,
`scroll-area`, `select`, `separator`, `tabs`, `toggle`, `toggle-group`,
`tooltip`, plus the `styled` helper module.

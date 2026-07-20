# `src/ui/` — in-house primitive library

`src/ui/` is the canonical, shadcn/ui-style home for every interactive UI primitive in this
codebase. It is adapted to our stack:

- **Behavior**: [Base UI](https://base-ui.com) (`@base-ui/react`) for anything interactive —
  dialogs, menus, popovers, selects, toggles, tabs, tooltips. Wrap Base UI parts rather than
  inventing new behavior — #626 (#627-#632) tracks swapping any remaining pre-migration
  implementation (`react-modal`, `react-aria-menubutton`, etc.) onto Base UI.
- **Styling**: [Emotion](https://emotion.sh) — the `css` prop / `styled` API and the `variants`
  cva-style helper in [`styled.ts`](./styled.ts). No Tailwind, no CSS Modules.
- **Convention**: same shape as shadcn/ui — primitives are copied/vendored into the repo, not pulled
  in as an opaque component-library dependency. You own the file, you can change it.

Tracked by #635 (DCMS-548), part of the Base UI migration tracked in #626 (DCMS-540).

## Component layering

Component code is layered; lower layers are dependencies of higher ones and must never import
upward. Enforced by the `local/layer-deps` ESLint rule in `eslint.config.mjs`:

1. `src/ui/` (including `src/ui/editor/`)
2. `src/ui/default/`, `src/ui/auth/`
3. `src/widgets/`
4. `src/core/components/` | `src/app/components/` | `src/laika-app/` — siblings; they must not
   import each other's components. A component two of them need belongs in layers 1-3. One
   sanctioned exception: the app shell (`app/components`) may compose `core/components` pages (the
   `allowed` edge in the rule config).

Every layer should build on Base UI (via the layer-1 primitives) and on the layers below it rather
than hand-rolling behavior. Non-component infrastructure (`core/actions`, `core/hooks`, `core/i18n`,
`lib/`, `backends/`, …) sits outside this model. The pre-existing edges where laika-app wraps the
app shell and core pages are grandfathered in the rule config as tracked debt - shrink that list,
never grow it.

## Folder layout

Each primitive is a flat file directly under `src/ui/`. Unlike stock shadcn/ui, files containing
React components are **PascalCase** (repo-wide convention), not kebab-case:

```
src/ui/<Primitive>.tsx              # the primitive itself, e.g. Button.tsx
src/ui/<Primitive>.stories.tsx      # Storybook stories (sibling, optional but expected)
src/ui/__tests__/<Primitive>.spec.tsx  # behavior tests (sibling __tests__ dir)
```

- One primitive per file. Compound primitives (e.g. `Dialog` + `DialogTrigger` + `DialogContent` +
  `DialogTitle`) live together in the same file — that's one primitive, several parts.
- No default exports (repo-wide convention — see `skills/typescript`). Export every part by name.
- `.tsx` for anything that renders JSX; `.ts` for pure styling/type helpers (e.g. `styled.ts`).

## Styling contract

- Use the `css` / `keyframes` re-exports from [`./styled.ts`](./styled.ts) (backed by
  `@emotion/react`) with the css prop — add the `` pragma at the top of the file. `cx` joins plain
  class-name strings only (literal utility classes plus a caller `className`); emotion merges the
  css prop with `className` itself. Don't reach for `styled-components` or inline `style={{}}` for
  anything variant-driven.
- Use the `variants()` helper for `class-variance-authority`-shaped variant props (see any existing
  primitive, e.g. `Button.tsx`'s `buttonVariants`, for the pattern). It returns styles for the css
  prop; a caller-supplied `className` is passed through separately instead of being merged in.
- Pull colors, spacing, typography from the existing theme tokens (see `src/ui/default/styles.tsx`)
  rather than hardcoding values. This is a **styling contract, not a restyle** — when migrating an
  existing primitive onto Base UI, its current Emotion output must stay pixel-identical.

## How to add a new primitive

Pick one:

1. **Base UI wrap** (preferred). Import the Base UI part(s) from `@base-ui/react/<part>`, layer
   Emotion styling via `render`/ `className`, expose a small typed API. This is the target shape for
   every primitive here — see #626/#627-#632 for the per-primitive migration and copy the pattern
   from whichever has already landed.
2. **Vendor**. If upstream (Base UI or elsewhere) doesn't cover the behavior, or the reference
   implementation is small/single-file/ unmaintained, copy the source into `src/ui/<primitive>.tsx`
   and adapt it to our styling contract. Note the origin (repo + commit/version) in a comment at the
   top of the file.
3. **CSS-only**. Purely presentational primitives with no interactive behavior (e.g. a `Separator`)
   don't need Base UI at all — a styled native element is enough.

In all three cases: add the file, add stories if the primitive has more than one visual state worth
demonstrating, add a spec covering the behavior contract (keyboard interaction, ARIA attributes,
controlled/ uncontrolled state), then export it from [`index.ts`](./index.ts).

**Enforcement status (DCMS-600):** this bar applies to new/changed primitives going forward. It is
not yet retroactively enforced — most of the primitives listed in "Current inventory" below predate
this rule and don't have a `src/ui/__tests__/<primitive>.spec.tsx` yet. `dialog` has one
(`src/ui/__tests__/dialog.spec.tsx`) as a reference example of the shape expected: keyboard
(Escape), ARIA (`role`, `aria-modal`, `aria-labelledby`, `aria-describedby`), and
controlled/uncontrolled (`open`/`defaultOpen`/ `onOpenChange`) coverage. Backfilling the rest is
tracked separately — don't assume a primitive has a spec just because it's listed here.

## Re-export policy

[`index.ts`](./index.ts) is the only barrel. It does `export * from
'./<primitive>'` for every
primitive file — no default export, no re-grouping into a namespace object. Consumers import by
name:

```ts
import { Dialog, DialogContent, DialogTrigger } from '@/ui';
```

`src/ui/default/`, `src/ui/auth/`, and `src/ui/editor/` are separate, pre-existing subtrees
(presentational legacy components, auth screens, and the Lexical rich-text editor — see #626's
non-goals) and are **not** re-exported through `index.ts`; they keep their own `./ui/default` /
`./ui/auth` / `./ui/editor` package export subpaths.

## Current inventory

Every primitive is a physical file here (the #635/DCMS-548 re-export stubs have been replaced by the
real implementations, moved up from the editor's old `ui/` subfolder): `alert-dialog`, `avatar`,
`button`, `button-group`, `checkbox`, `combobox`, `command`, `dialog`, `dropdown-menu`, `field`,
`input`, `label`, `popover`, `scroll-area`, `select`, `separator`, `tabs`, `toggle`, `toggle-group`,
`tooltip`, plus the `styled` helper module and the vendored `cmdk`. `combobox` wraps
`@base-ui/react/combobox` and is the searchable/async/multi-select primitive used by
`widgets/select` and `widgets/relation` (#631/DCMS-545) — reach for it instead of `select` whenever
typeahead filtering, chip-based multi-select, or async option loading is needed. `avatar` and
laika-app's `LaikaTooltip` consumers were deduped onto these canonical implementations in
#630/DCMS-544 — `src/laika-app/ui/LaikaTooltip.tsx` and `LaikaAvatar.tsx` are now thin
backwards-compatible aliases, not separate Base UI wrappers.

`src/ui/editor/` (the Lexical editor) is a _consumer_ of these primitives — it imports them from
`@/ui/<name>` like everyone else and holds no primitive implementations of its own.

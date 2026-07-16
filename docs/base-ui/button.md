# Button

Status: rejected

Base UI's Button (`@base-ui/react/button`) is a single-part primitive that renders a native
`<button>` by default. Its added value over a raw button element is: `render` composition (render
the button as another element or component while keeping button semantics via
`nativeButton={false}`), `focusableWhenDisabled` (keep keyboard focus on a disabled button, useful
for async/loading states so focus does not jump away), a `data-disabled` styling attribute, and
state-aware `className`/`style` functions.

## Current state in this repo

There are zero imports of `@base-ui/react/button`. The repo's shared button is hand-rolled:

- `src/ui/Button.tsx:156-173`: `Button` renders a plain native `<button>` with
  `type={props.type ?? 'button'}`, `data-slot`/`data-variant`/`data-size` attributes, and Emotion
  styles from `buttonVariants` (line 43), a variant map with 6 variants and 8 sizes. Props are
  `React.ComponentProps<'button'>` plus `variant`/`size` (line 151).
- Exported from `src/ui/index.ts:4`. About 25 files import it, nearly all in `src/ui/editor/`
  (toolbar plugins, action plugins, editor-ui) plus `src/ui/Dialog.tsx:7`.
- `buttonVariants` is also consumed standalone by `src/ui/AlertDialog.tsx:6` to style Base UI
  AlertDialog close/action parts as buttons, so the variant CSS already composes with Base UI parts
  without needing a Base UI Button.

## Why not adopt

A native `<button>` already has complete button semantics: role, keyboard activation, form
participation, disabled state. Base UI's Button only pays for itself when you need what it adds, and
no call site here does:

- Nothing renders `Button` as a non-button element (no `render`/asChild-style usage anywhere; links
  use the router's `Link`/`NavLink` components directly).
- Nothing needs `focusableWhenDisabled`; disabled styling is `&:disabled` with
  `pointer-events: none` (src/ui/Button.tsx:25-28) and no caller manages focus retention across a
  disabled transition.
- The state-function `className` feature is redundant with the Emotion `css` prop and the existing
  `data-variant`/`data-size` attributes.

Swapping internals would therefore add a wrapper layer with zero behavior change, while introducing
subtle churn (Base UI's disabled/event handling differs slightly from raw pass-through) across the
roughly 25 editor call sites. The one place Base UI button machinery would genuinely help is inside
a Base UI Toolbar, where `Toolbar.Button` participates in roving tabindex and defaults
`focusableWhenDisabled` to true; that is covered by the Toolbar proposal (docs/base-ui/toolbar.md)
and would not go through this generic primitive anyway.

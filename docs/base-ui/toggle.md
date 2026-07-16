# Toggle

Status: adopted

Base UI's Toggle (`@base-ui/react/toggle`) is a single-part, unstyled two-state button. It renders a
native `<button>` with `aria-pressed`, adds `data-pressed` when on, and supports `pressed` /
`defaultPressed` / `onPressedChange(pressed, eventDetails)` plus a `value` identifier for use inside
a Toggle Group. Not to be confused with this repo's two other "Toggle" names: `src/ui/Toggle.tsx`
also exports Base UI Switch parts (see `docs/base-ui/switch.md`), and `src/ui/default/Toggle.tsx` is
the classic-theme on/off switch built on those parts.

## Where it was already used

- `src/ui/ToggleGroup.tsx:2,114-126`: `ToggleGroupItem` renders `TogglePrimitive` from
  `@base-ui/react/toggle` directly, styled with the shared `toggleVariants` recipe from
  `src/ui/Toggle.tsx:72`. That path was Base UI before this change and is covered by
  `src/ui/__tests__/ui-primitives.spec.tsx:58-116`.

## What was adopted now

The standalone pressed-button `Toggle` in `src/ui/Toggle.tsx:106` was the odd one out: a hand-rolled
`<button>` that seeded `React.useState(defaultPressed)`, set `aria-pressed`/`data-state` manually,
and re-implemented controlled/uncontrolled switching in an `onClick` handler, even though the same
file's sibling primitives and `ToggleGroupItem` already came from Base UI.

Changes made (this working tree):

- `src/ui/Toggle.tsx`: `Toggle` now renders `TogglePrimitive` from `@base-ui/react/toggle`, passing
  `pressed`, `defaultPressed`, and a one-argument `onPressedChange` wrapper so the public signature
  stays `(pressed: boolean) => void`. The hand-rolled `useState`, manual `aria-pressed`, and
  `data-state` bookkeeping are gone; Base UI owns the state machine and a11y wiring. The pressed
  style selector switched from `[data-state='on']` to Base UI's `[data-pressed]` (the
  `[aria-pressed='true']` selector is kept and also still matches). `value` is narrowed to `string`
  for toggle-group usage, matching the primitive's type.
- `src/ui/__tests__/ui-primitives.spec.tsx:21-56`: new "Toggle (Base UI)" specs covering
  uncontrolled toggling (aria-pressed flips, `onPressedChange(true)` fires) and controlled usage (a
  static `pressed` prop is respected until the parent updates it).

The API is unchanged for the only production consumer,
`src/ui/editor/plugins/toolbar/LinkToolbarPlugin.tsx:13,78-85`, which passes `variant`, `size`,
`aria-label`, and `onClick` (Base UI forwards native button props, so the click handler behaves as
before). `toggleVariants`, `ToggleVariant`, and `ToggleSize` are still exported and still consumed
by `src/ui/ToggleGroup.tsx:7`.

Verification: `pnpm typecheck` passes;
`pnpm vitest run src/ui/__tests__/
ui-primitives.spec.tsx src/ui/__tests__/popup-primitives.spec.tsx`
passes (15 tests, including the 2 new Toggle specs); `eslint` on the touched files is clean.

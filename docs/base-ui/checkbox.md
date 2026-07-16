# Checkbox

Status: proposed

Base UI's Checkbox (`@base-ui/react/checkbox`) is an unstyled, accessible checkbox built from two
parts, `Checkbox.Root` (renders a `button` with a hidden native input) and `Checkbox.Indicator`
(visible only when checked or indeterminate). It exposes state through data attributes
(`data-checked`, `data-unchecked`, `data-indeterminate`, `data-disabled`), supports controlled and
uncontrolled usage via `checked` / `defaultChecked` / `onCheckedChange(checked, eventDetails)`, has
first-class `indeterminate` support, and integrates with Base UI's Field and Checkbox Group
components.

## Current state in this repo

There are zero imports of `@base-ui/react/checkbox`. The repo instead has a small hand-rolled
primitive:

- `src/ui/Checkbox.tsx`: a native `<input type="checkbox">` styled with Emotion via
  `appearance: none` plus a `::after` checkmark drawn with borders. It deliberately mimics the
  headless-library API by exposing `onCheckedChange?: (checked: boolean) => void`
  (src/ui/Checkbox.tsx:42-44) instead of `onChange`. Exported from `src/ui/index.ts:6`.

Call sites and related code:

- `src/ui/editor/editor-ui/DateTimeComponent.tsx:217`: the only consumer of the `@/ui` Checkbox, an
  "include time" toggle inside the richtext editor's date-time node.
- `src/ui/DropdownMenu.tsx:169-194`: `DropdownMenuCheckboxItem` uses Base UI's `Menu.CheckboxItem` /
  `Menu.CheckboxItemIndicator`. That is the menu module, not this component, but it shows the
  codebase already styles checked-state data attributes.
- `src/ui/default/Dropdown.tsx:264-301`: the legacy dropdown renders a decorative read-only
  `<input type="checkbox" tabIndex={-1}>` inside a `Menu.CheckboxItem` purely as a visual indicator.
- The boolean field widget (`src/widgets/boolean/BooleanControl.tsx`) is a toggle, not a checkbox;
  the underlying `src/ui/Toggle.tsx` already wraps `@base-ui/react/switch`, so there is direct
  precedent for wrapping a Base UI form primitive in `src/ui`.

## Proposed adoption

Replace the internals of `src/ui/Checkbox.tsx` with `Checkbox.Root` + `Checkbox.Indicator` while
keeping the exported name and Emotion styling:

- The public API barely changes: `checked`, `defaultChecked`, `disabled`, `id`, and
  `onCheckedChange` all map one to one (Base UI's callback adds a second `eventDetails` argument,
  which current callers ignore). The `DateTimeComponent` call site would work unchanged, including
  its `<Label htmlFor>` pairing, since `Checkbox.Root` still owns an id and a hidden native input
  for form and label association.
- Styling moves from `:checked` pseudo-class plus `::after` hacks to `[data-checked]` on Root and a
  real `Checkbox.Indicator` child (an SVG check), matching how `DropdownMenu.tsx` already styles
  Base UI parts with Emotion.

Benefits:

- Indeterminate state for free. This matters for future "select all" UX in the Laika shell, for
  example bulk selection over dashboard or workflow lists in `src/laika-app`, which the native-input
  version cannot express without manual `ref.indeterminate` plumbing.
- Consistency: Switch, Menu, Dialog, Toast, and other primitives in `src/ui` are Base UI based;
  Checkbox is currently the odd one out with a divergent styling mechanism.
- Field integration: Base UI Checkbox participates in `Field.Root` validation and labeling, useful
  if `src/ui` form plumbing later standardizes on Base UI Field.
- Slightly less bespoke CSS to maintain (the `appearance: none` and `::after` checkmark drawing
  disappear in favor of a plain SVG indicator).

Secondary candidate: `StyledDropdownCheckbox` in `src/ui/default/Dropdown.tsx` could render the
shared `@/ui` Checkbox (or just its indicator styling) instead of a raw read-only input, removing
one more hand-rolled checkbox visual, though as a purely decorative element inside
`Menu.CheckboxItem` this is a cosmetic cleanup rather than an a11y fix.

The existing unit test (`src/ui/__tests__/ui-primitives.spec.tsx:11-15`) queries by
`getByRole('checkbox')`, which continues to pass with Base UI since Root exposes the checkbox role,
so the migration is test-compatible.

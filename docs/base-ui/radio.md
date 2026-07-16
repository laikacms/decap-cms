# Radio

Status: rejected

Base UI's Radio (`@base-ui/react/radio`) is a two-part control (`Radio.Root` + `Radio.Indicator`)
that must live inside a `RadioGroup` (`@base-ui/react/radio-group`), which owns the single-selection
`value`/`onValueChange` state, keyboard roving focus, and a hidden input for form submission. It
integrates with Field for labeling and validation.

## Findings: no radio UI exists in this repo

- There are zero imports of `@base-ui/react/radio` or `@base-ui/react/radio-group`, zero
  `<input type="radio">` elements, and zero `role="radio"`/`radiogroup` attributes anywhere in
  `src/`.
- The only radio-flavored UI is menu radio items, which are a different Base UI module and already
  adopted: `DropdownMenuRadioGroup` and `DropdownMenuRadioItem` in
  `src/ui/DropdownMenu.tsx:32-35,198-221` wrap `Menu.RadioGroup` / `Menu.RadioItem` /
  `Menu.RadioItemIndicator`. Menu radio semantics belong to Menu, not Radio; nothing to migrate
  there.
- The CMS has no radio widget in its config vocabulary. Single-choice fields are the `select`
  widget, rendered with `react-select` (`src/widgets/select/SelectControl.tsx:3`), which also covers
  multiple/searchable modes; a low-cardinality "render select as radios" option does not exist in
  Decap's schema (`src/widgets/select/schema.ts`).
- Single-choice toggling in chrome UI is handled by `ToggleGroup` (`src/ui/ToggleGroup.tsx:3`,
  wrapping `@base-ui/react/toggle-group` with `toggleMultiple`), which is the appropriate primitive
  for toolbar-style exclusive selection and is already Base UI based.

## Motivation for rejection

Adopting Radio would mean introducing a primitive with no consumer: every existing single-choice
surface is already served by an adopted Base UI primitive (Menu.RadioItem, ToggleGroup, Select) or
by the widget system's react-select control, whose replacement is a separate, larger effort tracked
by the dependency reduction plan rather than a radio concern. If a `select` widget variant for small
option sets (or a Laika settings page with mutually exclusive options rendered as radio cards) is
ever added, `RadioGroup` + `Radio` wrapped in `src/ui` in the style of `Toggle.tsx` is the right
building block, composed inside the adopted `Field` for labeling (see `field.md`).

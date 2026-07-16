# Number Field

Status: rejected

Base UI's Number Field (`@base-ui/react/number-field`) is a rich numeric input: `NumberField.Root`
(state owner: `value: number | null`, `onValueChange`, `onValueCommitted`, `min`/`max`/`step` with
`smallStep`/`largeStep` modifiers, Intl-based `format`/`locale`, clamping unless `allowOutOfRange`)
plus `Group`, `Increment`/`Decrement` buttons, `Input`, and a pointer-lock
`ScrubArea`/`ScrubAreaCursor` for drag-to-change.

## Findings: where numbers are entered today

- Zero imports of `@base-ui/react/number-field`.
- The number widget, the obvious candidate, is a native `<input type="number">`
  (`src/widgets/number/NumberControl.tsx:200-211`) with `step` derived from
  `value_type: 'int' | 'float'` (line 198) and `min`/`max` from field config.
- Two chrome-level number inputs: table rows/columns
  (`src/ui/editor/plugins/
  TablePlugin.tsx:54-73`) and font size
  (`src/ui/editor/plugins/toolbar/
  FontSizeToolbarPlugin.tsx:61-67`), both via the `@/ui` Input.

## Motivation for not replacing the number widget

The widget's value contract is deliberately not `number | null`, which is the only model
NumberField.Root can hold:

- `handleChange` (src/widgets/number/NumberControl.tsx:152-194) stores the raw string as a sentinel
  when `parseInt` would round past `Number.MAX_SAFE_INTEGER` (lines 188-191) or `parseFloat`
  overflows to Infinity (lines 170-173), so `isValid()` (lines 95-150) can surface "exceeds the
  maximum safe integer / representable number" errors without persisting corrupted data. NumberField
  would coerce these cases to a clamped or non-finite number (or null), silently destroying the
  guard the widget grew specifically for arbitrary-precision IDs.
- Validation runs through the CMS engine, not the control: `isValid` is called by
  `validateWrappedControl` in `src/core/components/Editor/EditorControlPane/Widget.tsx`, and range
  errors are produced by the widget's own `validateMinMax`
  (src/widgets/number/NumberControl.tsx:13-58) with translated messages. NumberField's native
  `rangeUnderflow`/`rangeOverflow` validity plumbing only pays off inside Base UI Field/Form, which
  the entry editor intentionally does not use (see `forms.md`).
- NumberField formats the visible input through `Intl.NumberFormat` (locale grouping separators).
  The widget must round-trip exact `value_type`-typed values to front matter; locale-formatted
  display plus parse-back is a behavior change with i18n risk and no configured demand.
- The stepper buttons and scrub area are the main UX gain, but they are additive chrome; the native
  spinner already covers step increments, and the widget's extensive edge-case spec
  (`src/widgets/number/__tests__/number.spec.tsx`, including jsdom-sensitive value sanitization
  notes at line 271) would need a rewrite against a component that cannot represent half its tested
  states.

The chrome inputs (TablePlugin, FontSizeToolbarPlugin) are two tiny dialog/toolbar fields where
increment buttons would be cosmetic; not worth a new wrapper primitive yet. If a
`src/ui/NumberInput.tsx` is ever wanted (for example for Laika settings), NumberField is the right
base and composes with the adopted `Field` kit (`field.md`) for labeling.

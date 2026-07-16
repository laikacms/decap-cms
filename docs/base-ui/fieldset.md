# Fieldset

Status: adopted

Base UI's Fieldset (`@base-ui/react/fieldset`) is a two-part primitive: `Fieldset.Root` renders a
native `<fieldset>` and `Fieldset.Legend` renders a `<div>` by default (easier to style than a
native `<legend>`) that is associated with the fieldset via `aria-labelledby`. Root exposes a
`data-disabled` state and propagates disabled state to Field parts inside it.

## What was adopted

`src/ui/Field.tsx` already exported a hand-rolled `FieldSet` (native `<fieldset>`) and `FieldLegend`
(native `<legend>` with a `legend`/`label` size variant). As part of the Field kit rebase (see
`field.md`) these were switched to the Base UI parts:

- `FieldSet` (src/ui/Field.tsx:17) now renders `Fieldset.Root`, keeping the flex-column Emotion
  styling and `data-slot="field-set"`.
- `FieldLegend` (src/ui/Field.tsx:35) now renders `Fieldset.Legend` with `render={<legend />}`, so
  the DOM stays a real `<legend>` (native association preserved, plus Base UI's `aria-labelledby`
  wiring) and the existing `data-variant` styling hook is unchanged.

This was a ride-along of the Field migration rather than a standalone win: `FieldSet` and
`FieldLegend` currently have zero call sites in the repo (the only `<fieldset>`-family markup
anywhere is this kit itself), so the change is behavior-neutral today. The benefit is that the kit
is now uniformly Base UI based, and any future consumer that disables a `FieldSet` gets
`data-disabled` propagation into nested `Field` parts for free.

## Where a fieldset would plausibly be used next

- Grouped controls in the richtext editor dialogs (`src/ui/editor/extensions/
  ImagesExtension.tsx`
  uses `FieldGroup`, a plain div, where a semantic fieldset + legend would fit for the URL/upload
  tab bodies).
- The code widget's settings pane (`src/widgets/code/SettingsPane.tsx:113-139`) renders three
  labeled selects with a local `styled.label`; it is core-layer UI that could adopt the `@/ui` kit
  wholesale if it is ever redesigned.

Verification: covered indirectly by `src/ui/__tests__/field.spec.tsx` (module imports and renders),
`pnpm typecheck` passes, and `pnpm vitest run src/ui/__tests__` passes.

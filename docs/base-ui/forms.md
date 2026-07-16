# Forms (handbook)

Status: proposed

The Base UI forms handbook is a cross-cutting guide, not a component. It covers `<Form>`,
`<Field.Root>` / `<Field.Label>` / `<Field.Description>` / `<Field.Error>`, `<Fieldset>`, labeling
rules per control type, native constraint validation (`required`, `pattern`, ...), the `validate` /
`validationMode` props, and server-side `errors` merging on `<Form>`.

This repo does not import `@base-ui/react/form`, `field`, or `fieldset` anywhere. Form plumbing is
hand-rolled at three distinct layers.

## What exists today

1. Presentational field kit: `src/ui/Field.tsx` exports `FieldSet`, `FieldLegend`, `FieldGroup`,
   `Field`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`,
   `FieldError`. These are shadcn-style plain `div`/`label`/`p`/`fieldset` elements styled with
   Emotion `css` from `src/ui/styled.ts`. There is no state or aria wiring: callers must pair
   `htmlFor`/`id` by hand, and `FieldError` (src/ui/Field.tsx:230) renders `role="alert"` but is
   never linked to a control via `aria-describedby`. Companions: `src/ui/Input.tsx` (native input),
   `src/ui/Label.tsx`, `src/ui/Checkbox.tsx` (a styled native `appearance: none` checkbox, not Base
   UI's). Call site example: the richtext image dialog
   `src/ui/editor/extensions/ImagesExtension.tsx:49-69` manually wires
   `FieldLabel htmlFor="image-url"` to `Input id="image-url"`.

2. Entry-editor validation engine: `src/core/components/Editor/EditorControlPane/Widget.tsx:190`
   (`validate`, `validatePresence`, `validatePattern`, `validateWrappedControl`) plus
   `EditorControl.tsx`, which renders the legacy `FieldLabel` from `src/ui/default/FieldLabel.ts`
   and a `ControlErrorsList`. Errors flow through Redux (`fieldsErrors`, `clearFieldErrors` in
   `src/core/actions/entries.tsx`), not through native form submission.

3. One-off native forms: `src/ui/auth/NetlifyAuthenticationPage.tsx:191` builds a login
   `<form onSubmit>` with `styled.form`, `styled.input`, and manual `errors` state per field (lines
   139-141, 194, 202). `src/core/components/Collection/CollectionSearch.tsx` and `Sidebar.tsx` wrap
   search inputs in bare `<form>` elements.

Individual Base UI form controls are already in use, but always standalone, outside any
`Field`/`Form` context: Switch (`src/ui/Toggle.tsx`, `src/laika-app/ui/LaikaToggleSwitch.tsx`),
Select (`src/ui/Select.tsx`), Autocomplete (`src/laika-app/LaikaCommandPalette.tsx`). Neither switch
wrapper carries a label association; `src/laika-app/LaikaSettingsPage.tsx:143` places visible text
next to `LaikaToggleSwitch` without connecting it, which is exactly the gap the handbook's
"implicitly label a Switch with Field.Label" pattern closes.

## Where adoption would pay off

- Rebase `src/ui/Field.tsx` on `@base-ui/react/field` and `@base-ui/react/fieldset`, keeping the
  existing Emotion classes on `Field.Root` / `Field.Label` / `Field.Description` / `Field.Error` via
  `className`. Benefit: automatic label/description/error association (deletes every manual
  `htmlFor`/`id` pair, e.g. ImagesExtension), `data-invalid` and `data-touched` state attributes
  replacing the hand-set `data-invalid` styling hook at src/ui/Field.tsx:61, and a `Field.Error`
  that actually points at its control.

- `src/ui/auth/NetlifyAuthenticationPage.tsx`: replace the manual per-field `errors` state with
  `<Form errors={...}>` plus `Field.Root name="email" required` and
  `<Field.Error match="valueMissing">`. The server error from `netlifyIdentity` maps directly onto
  the `errors` prop described in the "Server-side validation" section.

- `src/laika-app/ui/LaikaToggleSwitch.tsx` and settings rows in `LaikaSettingsPage.tsx`: wrap in
  `Field.Root` with an implicit `Field.Label` around `Switch.Root` per the handbook's input-control
  labeling table, giving the switches accessible names for free.

- `src/ui/Select.tsx`: when it gains form usage, the handbook's hidden-input guidance applies (give
  `Field.Root` a `name`, keep the trigger in a relatively positioned container so the native
  validation bubble anchors correctly).

## Where it does not fit

The core entry editor (`Widget.tsx` / `EditorControl.tsx`) should keep its Redux-driven validation.
It is not a submit-based form: values persist continuously to the store, errors are cross-field and
workflow-aware (meta fields, i18n duplicates), and widgets like `select` and `relation` still render
`react-select` (`src/widgets/select/SelectControl.tsx:3`), not Base UI controls. Migrating that
layer is a separate, much larger effort than adopting the handbook's Field/Form primitives in the
design-system and auth layers above.

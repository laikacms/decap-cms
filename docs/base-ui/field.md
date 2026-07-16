# Field

Status: adopted

Base UI's Field (`@base-ui/react/field`) groups a form control with its label, description, and
error message: `Field.Root` (a `<div>` providing context), `Field.Label` (auto-associated
`<label>`), `Field.Control` (an `<input>`, or any Base UI control placed inside the Root),
`Field.Description`, `Field.Error` (shown on validation failure, or forced with `match`), and
`Field.Validity` (render-prop access to `ValidityState`). Root accepts `name`, `disabled`, `invalid`
/ `dirty` / `touched` (for external state), a `validate` callback, and `validationMode`, and exposes
state through `data-valid` / `data-invalid` / `data-dirty` / `data-touched` / `data-filled` /
`data-focused` attributes on every part.

## What was adopted

The presentational field kit in `src/ui/Field.tsx` was rebased onto Base UI while keeping every
export name, the Emotion classes, and the `data-slot` attributes:

- `Field` (src/ui/Field.tsx:107) now renders `Field.Root` instead of a bare `role="group"` div; the
  `orientation` variant styling and `role="group"` are preserved.
- `FieldLabel` (src/ui/Field.tsx:150) renders `Field.Label` through the shared `Label`
  (`render={<Label />}`), so labels associate with the control automatically; an explicit `htmlFor`
  still wins when provided.
- `FieldDescription` (src/ui/Field.tsx:194) renders `Field.Description` (still a `<p>`), which now
  registers itself in the control's `aria-describedby`.
- `FieldError` (src/ui/Field.tsx:275) renders `Field.Error`. Its previous API is kept: with explicit
  `children` or the `errors` array prop (deduplicated, single message or `<ul>`) it always renders
  (`match` forced to `true`) and is announced via `aria-describedby`; without explicit content it
  now falls back to Base UI's own behavior of showing native constraint or `validate` errors when
  the field is invalid.
- The purely presentational parts with no Base UI counterpart are unchanged: `FieldGroup` (line 61),
  `FieldContent` (line 134), `FieldTitle` (line 175), `FieldSeparator` (line 231).
- `src/ui/Input.tsx` was rebased on `@base-ui/react/input` in the same pass (see `input.md`), so
  `Field` + `FieldLabel` + `Input` now wire label and description ids with no manual `htmlFor`/`id`
  pairing.

One behavioral contract changed: `FieldLabel`, `FieldDescription`, and `FieldError` must now be
rendered inside a `Field` (Base UI throws "Field parts must be placed within <Field.Root>"
otherwise). The only pre-existing consumer already satisfies this:
`src/ui/editor/extensions/ImagesExtension.tsx:50-69,109-128` nests `FieldLabel` + `Input` inside
`Field`, and its explicit `htmlFor`/`id` pairs keep working unchanged (verified by spec). No call
sites needed edits.

Coverage: `src/ui/__tests__/field.spec.tsx` (new) asserts automatic label association, explicit
`htmlFor`/`id` compatibility, `aria-describedby` linking of description and error, error-list
deduplication, no error rendered without content or invalid state, and standalone controlled `Input`
behavior. `pnpm typecheck` passes; `pnpm vitest run src/ui/__tests__` passes (the two failing
transformer suites under `src/ui/editor/transformers/__tests__` are pre-existing stale-import
failures from the in-flight file move, unrelated to this change).

## What was deliberately not adopted

The entry editor's validation engine keeps its Redux model. Widget validation runs through
`src/core/components/Editor/EditorControlPane/Widget.tsx:190` (`validate`, `validatePresence`,
`validatePattern`, `validateWrappedControl`) and errors flow through the store (`fieldsErrors`), not
native form submission; `EditorControl.tsx` renders the legacy `src/ui/default/FieldLabel.ts` and
`ControlErrorsList`. Field's per-control `validate`/`validationMode` model cannot express the CMS's
cross-field, i18n-aware, workflow-aware validation without a much larger refactor, so that layer
intentionally stays as documented in `forms.md` ("Where it does not fit"). This adoption covers the
design-system layer that `forms.md` proposed under "Rebase src/ui/Field.tsx on
@base-ui/react/field"; that item is now done.

# Input

Status: adopted

Base UI's Input (`@base-ui/react/input`) is a single-part styled-agnostic `<input>`. It is literally
`Field.Control` re-exported under a standalone name: it accepts all native input props (plus
`onValueChange` and the `render` prop), works exactly like a native input when used alone, and when
rendered inside a `Field.Root` it automatically picks up label association, `aria-describedby`
wiring for descriptions/errors, and validation state (`data-invalid`, `data-dirty`, `data-touched`,
`data-filled`, `data-focused`).

## What was adopted

`src/ui/Input.tsx` previously rendered a bare native `<input>` with Emotion styling. It now renders
the Base UI Input with the identical class (src/ui/Input.tsx:43), the same `data-slot="input"` hook,
and an added `&[data-invalid]` border style so validation state becomes visible when the input sits
inside a `Field`. An `InputProps` type is exported (line 35). This completes the pairing with the
rebased Field kit (see `field.md`): `Field` + `FieldLabel` + `Input` now associate automatically
with no `htmlFor`/`id` bookkeeping.

All existing call sites pass plain native props and keep working unchanged (verified by typecheck
and the new spec's controlled-input test):

- `src/ui/editor/extensions/ImagesExtension.tsx:52,62,111,121`: URL, alt-text, and `type="file"`
  upload inputs inside `Field`s; these now gain automatic label association (their explicit
  `htmlFor`/`id` pairs still win and still match).
- `src/ui/editor/plugins/TablePlugin.tsx:54,65`: rows/columns `type="number"` inputs.
- `src/ui/editor/plugins/FloatingLinkEditorPlugin.tsx:212`: link URL input, passes `ref` (forwarded
  by Base UI to the underlying element).
- `src/ui/editor/plugins/toolbar/FontSizeToolbarPlugin.tsx:61`: font size with `min`/`max`.
- `src/ui/editor/plugins/embeds/AutoEmbedPlugin.tsx:190`: embed URL input.
- `src/ui/editor/editor-ui/DateTimeComponent.tsx:206,223`: `type="date"` / `type="time"` inputs that
  pass an Emotion `css` prop from the caller; Emotion resolves that to `className` before Base UI
  sees it, so style merging is unchanged.

Standalone behavior is unchanged because Base UI's field context is optional for the control part
(`useFieldRootContext(optional = true)` returns an inert default outside `Field.Root`).

Verification: `pnpm typecheck` passes;
`pnpm vitest run src/ui/__tests__/field.spec.tsx
src/ui/__tests__/ui-primitives.spec.tsx` passes (17
tests), including a controlled standalone `Input` typing test and Field-integration tests.

## Not adopted

The entry-editor widget inputs (e.g. `src/widgets/string/`,
`src/widgets/number/
NumberControl.tsx:200`) keep their native inputs: they are styled by the core
`classNameWrapper` system and validated by the CMS engine, not by Field context, so swapping them
buys nothing today (see `forms.md` and `number-field.md`).

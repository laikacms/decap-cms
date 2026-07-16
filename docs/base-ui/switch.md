# Switch

Status: used

Base UI's Switch (`@base-ui/react/switch`) is an unstyled on/off control with two parts:
`Switch.Root` (a `role="switch"` button with a hidden native input for form submission) and
`Switch.Thumb`. It exposes state through `data-checked`/`data-unchecked`/ `data-disabled`, supports
`checked`/`defaultChecked`/`onCheckedChange`, and provides keyboard (Space/Enter) and label/field
integration from the primitive.

## Where it is used

Three layers of the repo build on it, one per shell/design-system tier:

1. `src/ui/Toggle.tsx:17-26`: exports unstyled passthrough parts `Switch` (`SwitchPrimitive.Root`
   with `data-slot="switch"`) and `SwitchThumb` (`SwitchPrimitive.Thumb`). Deliberately style-free:
   consumers supply visuals through the `render` prop or their own children, so all on/off toggles
   converge on one accessible primitive (see the doc comment at `src/ui/Toggle.tsx:10-15`).
2. `src/ui/default/Toggle.tsx:5,78-104`: the classic-theme `Toggle` renders that `Switch` with
   `render={<Container />}` plus swappable `Background`/`Handle` styled spans. It is fully
   controlled (`checked={active}`, no internal state seed), which fixed the prop-sync defect
   DCMS-543. Consumer: the boolean field widget (`src/widgets/boolean/BooleanControl.tsx:3,39`),
   which customizes `Background` for its active color; also covered by
   `src/ui/default/Toggle.stories.tsx`.
3. `src/laika-app/ui/LaikaToggleSwitch.tsx:2,27-77`: the Laika shell's switch, an Emotion `Track`
   (`Switch.Root`) and `Knob` (`Switch.Thumb`) styled via `[data-checked]` and `[data-disabled]`,
   with `md`/`sm` sizes. Consumer: `src/laika-app/LaikaSettingsPage.tsx:8,143` (binary preferences
   such as theme and beta flags). Exported through `src/laika-app/ui/index.ts` and the public
   `src/laika-app/bare.ts`; covered by `LaikaToggleSwitch.stories.tsx` and
   `src/laika-app/ui/__tests__/LaikaToggleSwitch.spec.tsx`.

## Why no further adoption

There are no hand-rolled switches left: every on/off control routes through one of the three
wrappers above, and each wrapper delegates state, `role="switch"` semantics, and keyboard handling
to the same Base UI primitive. The naming is the only wrinkle (the file `src/ui/Toggle.tsx` exports
both these Switch parts and the pressed-button `Toggle`; see `docs/base-ui/toggle.md` for that
component), but renaming files is churn without benefit while both primitives share the
`toggleVariants` styling recipe defined there.

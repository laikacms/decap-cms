# TypeScript

Status: proposed

The handbook page `handbook/typescript` documents the type surface Base UI exports on each component
part's namespace: `Props` (e.g. `Tooltip.Root.Props`), `State` (for `render` prop callbacks), and
event types such as `ChangeEventDetails` / `ChangeEventReason` for handlers like `onValueChange` and
`onOpenChange`. It also mentions `Actions` types for `actionsRef`, `Toast.Root.ToastObject`, and
`useRender.ComponentProps`.

## What the repo does today

The repo is fully TypeScript (`strict: true`) and wraps every Base UI component it uses, but it does
not use the namespace types from this guide anywhere. A grep for `ChangeEventDetails`,
`ChangeEventReason`, `.Root.Props`, `State`, and `useRender` across `src/` finds zero hits.

Instead, the `src/ui` wrappers type themselves with two local conventions:

- `React.ComponentProps<typeof Primitive.Part>` to inherit the part's props, for example
  `src/ui/Tooltip.tsx:15`, `src/ui/Popover.tsx:8`, `src/ui/DropdownMenu.tsx:9`,
  `src/ui/Select.tsx:23`.
- `WithClassName<P>`, defined at `src/ui/styled.ts:79` as
  `Omit<P, 'className'> & { className?: string }`, to flatten Base UI's callback-capable `className`
  prop down to a plain string for Emotion's `css` prop.

Derived prop types are picked off the inherited type where needed, for example
`PositionerProps['align']` / `['side']` in `src/ui/Select.tsx:191-203`, `src/ui/Popover.tsx:34-47`,
and `src/ui/DropdownMenu.tsx:58-68`.

The `laika-app` wrappers go further and define fully hand-rolled interfaces that do not inherit from
Base UI at all (`LaikaDialogProps` at `src/laika-app/ui/LaikaDialog.tsx:55`, `LaikaTooltipProps` at
`src/laika-app/ui/LaikaTooltip.tsx:36`, `LaikaToggleSwitchProps` at
`src/laika-app/ui/LaikaToggleSwitch.tsx:79`). That is a deliberate narrow API, which the guide
explicitly supports via the `Props` types, so those are fine as-is.

## Where the guide's patterns would help

The installed `@base-ui/react` 1.6.0 does export the namespace types (verified in
`node_modules/@base-ui/react/select/root/SelectRoot.d.ts:149`, which declares `namespace SelectRoot`
with `Props`, `ChangeEventDetails`, and `ChangeEventReason`). Concrete adoption candidates:

1. `src/ui/Select.tsx:8-20`: the wrapper strips `onValueChange` and re-declares it as
   `(value: string) => void`, then bridges with
   `(value: unknown) => onValueChange(value as string)`. This erases both the `Select` value generic
   and the `eventDetails` second argument. Typing the handler as Base UI does,
   `(value, eventDetails: SelectPrimitive.Root.ChangeEventDetails) => void`, or simply extending
   `SelectPrimitive.Root.Props<string>`, would remove the `unknown` cast and keep the reason
   metadata available to callers.

2. `src/ui/ToggleGroup.tsx:41-83`: single/multiple variants re-declare `onValueChange` and cast
   between the two shapes (`onValueChange as ToggleGroupSingleProps['onValueChange']`). The
   namespace `Props` type plus `ChangeEventDetails` would let the discriminated union be expressed
   without casts.

3. `src/ui/toastManager.ts`: builds on `Toast.createToastManager()` with a local `ToastType` union.
   If the toast payload ever grows, `Toast.Root.ToastObject` is the documented type to extend
   instead of re-modelling it.

4. Everywhere `WithClassName<React.ComponentProps<typeof Primitive.Part>>` appears, the equivalent
   `Primitive.Part.Props` is shorter and survives Base UI refactors of internal generics better than
   `ComponentProps` inference. This is a mechanical, low-risk cleanup across `src/ui/Tooltip.tsx`,
   `Popover.tsx`, `DropdownMenu.tsx`, `Select.tsx`, `Toggle.tsx`, and `AlertDialog.tsx`.
   `WithClassName` would still be needed on top, since Base UI's `className` accepts a
   `(state) => string` callback that the repo intentionally narrows to `string`.

No wrapper currently uses the `render` prop with a state callback, so the `State` types have no
immediate call site; they become relevant if `src/ui` starts styling parts per-state (e.g.
`Popover.Positioner` side/align) instead of via `data-*` attribute selectors.

## Conclusion

The guide is not followed today, but the repo has real friction (casts in `Select` and
`ToggleGroup`, verbose `ComponentProps` inference) that the namespace `Props` and
`ChangeEventDetails` types would remove. Recommended as a small mechanical refactor of the `src/ui`
wrappers; the hand-rolled `laika-app` interfaces can stay narrow by design.

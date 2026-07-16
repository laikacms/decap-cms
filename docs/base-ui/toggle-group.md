# Toggle Group

Status: used

Base UI's Toggle Group (`@base-ui/react/toggle-group`) groups Toggle buttons and manages a shared
value array, roving focus with arrow keys, and `role="group"` semantics. Its value model is always
`string[]` with a `multiple` boolean; single-select is `multiple: false` where the array holds zero
or one entries.

## Where it is used

The wrapper is `src/ui/ToggleGroup.tsx` (exported via `src/ui/index.ts:22`):

- `ToggleGroup` (`src/ui/ToggleGroup.tsx:59-98`): wraps `ToggleGroupPrimitive`
  (`src/ui/ToggleGroup.tsx:3`) behind a Radix/shadcn-style API: a `type: 'single' |
  'multiple'`
  union (`ToggleGroupSingleProps` / `ToggleGroupMultipleProps`, `src/ui/ToggleGroup.tsx:37-51`) is
  adapted to Base UI's array model by `toArrayValue` (`src/ui/ToggleGroup.tsx:53-57`) and an
  `onValueChange` shim that unwraps `groupValue[0]
  ?? ''` for single mode
  (`src/ui/ToggleGroup.tsx:79-84`). A React context (`src/ui/ToggleGroup.tsx:22-28`) pushes
  `size`/`variant` down to items.
- `ToggleGroupItem` (`src/ui/ToggleGroup.tsx:100-127`): renders `Toggle` from
  `@base-ui/react/toggle` with a required `value`, styled by the shared `toggleVariants` recipe from
  `src/ui/Toggle.tsx:72`.

Production call sites, all richtext editor toolbars:

- `src/ui/editor/plugins/FloatingTextFormatPlugin.tsx:29`: floating selection toolbar
  (bold/italic/etc. as a multiple group).
- `src/ui/editor/plugins/toolbar/FontFormatToolbarPlugin.tsx:8`: font format group.
- `src/ui/editor/plugins/toolbar/ElementFormatToolbarPlugin.tsx:25`: block alignment group.
- `src/ui/editor/plugins/toolbar/SubsuperToolbarPlugin.tsx:8`: subscript/superscript (single group
  where deselection matters).

Tested in `src/ui/__tests__/ui-primitives.spec.tsx:58-116`: multiple-mode accumulation, single-mode
deselect-on-repeat-click reporting `''`, and arrow-key focus movement between items.

## Considered and not migrated

`src/laika-app/LaikaCollectionControls.tsx:44,92-111` has a styled div literally named
`ViewToggleGroup` holding two `LaikaIconButton`s (list/grid view style) with an `active` prop.
Functionally it is a single-select toggle group, but it is two independent `aria-pressed` icon
buttons that follow the Laika shell's own `LaikaIconButton` visual language rather than
`toggleVariants`, and per the layering rules laika-app components prefer their local
`src/laika-app/ui` primitives. Rewiring it through `@/ui/ToggleGroup` would change styling for no
behavioral gain (arrow-key roving focus over a two-button pair is a marginal win), so it stays as
is.

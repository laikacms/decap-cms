# Menu

Status: used

Base UI's Menu (`@base-ui/react/menu`) is an unstyled dropdown menu opened from a button. Its parts
are `Menu.Root`, `Menu.Trigger`, `Menu.Portal`, `Menu.Positioner`, `Menu.Popup`, `Menu.Item`,
`Menu.Group` / `Menu.GroupLabel`, `Menu.CheckboxItem` (+ indicator), `Menu.RadioGroup` /
`Menu.RadioItem` (+ indicator), `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`, `Menu.Separator`, and
`Menu.Arrow`. It provides menu-button ARIA wiring (aria-haspopup, aria-expanded, aria-controls,
role="menu"/"menuitem"), typeahead, keyboard navigation, and anchored positioning. This is one of
the most broadly adopted Base UI parts in the repo, with three independent wrappers serving the
three UI layers.

## Where it is used

1. `src/ui/DropdownMenu.tsx:3`: the design-system wrapper for the richtext editor UI. It re-exports
   every Menu part under shadcn-style names: `DropdownMenu` (Root, line 8), `DropdownMenuTrigger`
   (line 20), `DropdownMenuContent` (Portal + Positioner + Popup, lines 60-83), `DropdownMenuItem`
   (line 148), `DropdownMenuCheckboxItem` with `Menu.CheckboxItemIndicator` (lines 169-196),
   `DropdownMenuRadioItem` (line 198), `DropdownMenuSub` / `DropdownMenuSubTrigger` (lines 38-42,
   225-249), `DropdownMenuLabel` (line 261), and `DropdownMenuSeparator` (line 285). All styled with
   Emotion `css` against the editor token variables (`--popover`, `--accent`, ...), keying off Base
   UI data attributes (`[data-highlighted]`, `[data-disabled]`, `[data-inset]`). Consumers include
   the richtext toolbar plugins
   (`src/ui/editor/plugins/toolbar/BlockFormatToolbarPlugin.tsx:12-15,58-69`,
   `src/ui/editor/plugins/toolbar/BlockInsertPlugin.tsx:6-9`,
   `src/ui/editor/plugins/toolbar/FontFamilyToolbarPlugin.tsx`) and every `block-format/*` /
   `block-insert/*` item component, which each import `DropdownMenuItem` (e.g.
   `src/ui/editor/plugins/toolbar/block-insert/InsertImage.tsx:5`,
   `src/ui/editor/plugins/toolbar/block-format/FormatHeading.tsx:7`).

2. `src/ui/default/Dropdown.tsx:4`: the legacy classic-app dropdown, migrated from
   react-aria-menubutton onto Base UI Menu while keeping its old `renderButton` / `DropdownItem` API
   (see the module comment, lines 11-19). `DropdownButton` is a styled `Menu.Trigger` (line 32), the
   popup is `Menu.Positioner` + `Menu.Popup` (lines 65-90), items are `Menu.Item` /
   `Menu.CheckboxItem` (lines 120-130), and the root runs with `modal={false}` to preserve the old
   non-modal behavior (line 211). It also uses the function form of `sideOffset` to reproduce the
   old overlap geometry (line 221). Consumers: `src/core/components/UI/SettingsDropdown.tsx:6`,
   `src/core/components/Collection/SortControl.tsx:4`,
   `src/core/components/Collection/FilterControl.tsx:4`,
   `src/core/components/Collection/GroupControl.tsx:4`,
   `src/core/components/Editor/EditorToolbar.tsx` (status/publish dropdowns),
   `src/core/components/Workflow/Workflow.tsx`, and `src/ui/default/ObjectWidgetTopBar.tsx:8` ("add
   item" menus in list/object widgets).

3. `src/laika-app/LaikaHeader.tsx:6`: the Laika shell's quick-add menu composes Menu parts directly
   with Emotion `styled` (trigger at lines 205-239, positioner/popup/items at lines 241-264, JSX at
   lines 352-370), including the `[data-popup-open]` state selector on the trigger.

## Motivation

Adopted repo-wide already; nothing hand-rolled remains for button-opened menus (the old
react-aria-menubutton dependency was dropped in favor of this). Three wrappers rather than one is
intentional layering: `src/ui` serves the editor design system, `src/ui/default` preserves the
classic-app API for legacy call sites, and the Laika shell styles the raw parts to its own visual
language. Consolidation would couple layers that `local/layer-deps` deliberately keeps apart.

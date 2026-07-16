# Toolbar

Status: proposed

Base UI's Toolbar (`@base-ui/react/toolbar`) implements the ARIA toolbar pattern: a `Toolbar.Root`
container (with `orientation` and `loopFocus`) that manages a roving tabindex over `Toolbar.Button`,
`Toolbar.Link`, `Toolbar.Input`, and `Toolbar.Group` items, so the whole toolbar is one tab stop and
arrow keys move between controls. `Toolbar.Separator` provides correctly-oriented dividers. Popup
triggers (Menu, Select, Popover, Dialog) join the roving order by rendering their Trigger through
`Toolbar.Button`'s `render` prop, and `focusableWhenDisabled` defaults to `true` so disabled items
do not break arrow-key traversal.

## Current state in this repo

There are zero imports of `@base-ui/react/toolbar`, and no toolbar in the app implements roving
focus. Three toolbar-shaped surfaces exist:

- The richtext editor toolbar, `src/ui/editor/Editor.tsx:311-372`: a plain flex `<div>` (no
  `role="toolbar"`, no keyboard pattern) populated by roughly 15 plugin components in
  `src/ui/editor/plugins/toolbar/` (History, BlockFormat, FontFamily, FontSize, FontFormat,
  SubSuper, Link, ClearFormatting, FontColor, FontBackground, ElementFormat, BlockInsert,
  CodeLanguage), each rendering `@/ui` Buttons, Selects, or DropdownMenus. `ToolbarPlugin`
  (`src/ui/editor/plugins/toolbar/ToolbarPlugin.tsx:8`) is only a state/render-prop provider, not an
  ARIA pattern. Today every control is its own tab stop, so tabbing from the toolbar into the editor
  takes 20+ presses.
- The floating selection toolbar, `src/ui/editor/plugins/FloatingTextFormatPlugin.tsx:181-289`:
  built from `@/ui` ToggleGroup (which already wraps `@base-ui/react/toggle-group`, so its items
  have grouped arrow-key behavior), two groups plus decorative Separators inside a plain positioned
  `<div>`.
- `src/laika-app/LaikaCollectionControls.tsx:73`: a `<Bar role="toolbar">` that claims the ARIA
  toolbar role but provides no roving tabindex, an accepted-pattern gap. Its children are composite
  controls (`SortControl`, `FilterControl`, `GroupControl` from `src/core/components/Collection/`)
  whose trigger buttons live inside those core components, out of reach of a local Toolbar.Button
  wrapper.

## Proposed adoption

Retrofit the richtext editor toolbar, where the win is real: wrap the toolbar row in `Toolbar.Root`
(horizontal, `loopFocus`), render each plugin's `Button` through `Toolbar.Button` (via its `render`
prop around the existing `@/ui` Button so the Emotion variants are untouched), route
DropdownMenu/Select triggers through `Toolbar.Button
render={<Menu.Trigger />}` per the Base UI
composition recipe, and replace the seven `Separator orientation="vertical"` dividers with
`Toolbar.Separator`. Result: one tab stop, arrow-key navigation, `role="toolbar"` semantics, and
disabled undo/redo buttons that stay reachable (`focusableWhenDisabled`).

Why it is not done now, honestly:

- It is a cross-cutting change over `Editor.tsx` plus ~15 plugin files, and every popup trigger
  (DropdownMenu, Select, Popover in FontColor/FontBackground) needs individual render-prop rewiring
  and manual keyboard testing; a mechanical half-migration would leave some controls outside the
  roving order, which is worse than the status quo.
- The toolbar row is `overflow-auto` (Editor.tsx:313); arrow-key focus movement combined with
  horizontal scrolling needs real-browser verification (the `verify` skill), not just jsdom specs.
- All controls are reachable today via tab; the current state is verbose but not broken, so this is
  an improvement, not a fix, and does not justify a risky rush while parallel agents are active in
  `src/ui`.

Secondary cleanups for the same effort: give `LaikaCollectionControls` a real pattern (either drop
the `role="toolbar"` claim or migrate once the core Sort/Filter/Group triggers can be composed), and
consider `Toolbar.Root` around the two ToggleGroups in the floating format bar so cross-group arrow
navigation works.

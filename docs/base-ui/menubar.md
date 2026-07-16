# Menubar

Status: rejected

Base UI's Menubar (`@base-ui/react/menubar`) is a single container component (a `div` with the
`menubar` role) that wraps multiple `Menu.Root` instances to build a desktop-application menu bar:
File / Edit / View style menus with roving focus, arrow-key movement between menus, and hover-open
of sibling menus once one menu is open. Props are just `modal`, `disabled`, `orientation`, and
`loop` (`node_modules/@base-ui/react/menubar/Menubar.d.ts`).

## Current state in this repo

There are zero imports of `@base-ui/react/menubar`. The places that superficially resemble a menubar
were each checked:

- Collection controls: `src/core/components/Collection/SortControl.tsx:4`, `FilterControl.tsx:4`,
  and `GroupControl.tsx:4` render three adjacent dropdowns built on the legacy `Dropdown`
  (`src/ui/default/Dropdown.tsx`, itself Base UI Menu underneath).
- Richtext editor toolbar: the block-format, font-family, and block-insert dropdowns
  (`src/ui/editor/plugins/toolbar/BlockFormatToolbarPlugin.tsx:58-69`,
  `FontFamilyToolbarPlugin.tsx`, `BlockInsertPlugin.tsx`) sit side by side in the editor toolbar,
  each with its own `DropdownMenu` root from `src/ui/DropdownMenu.tsx`.
- App headers: `src/app/components/Header.tsx` and `src/laika-app/LaikaHeader.tsx` mix nav links,
  buttons, and a single menu each; there is no row of menus.

## Motivation for rejection

- Nothing in this CMS is a menu bar in the WAI-ARIA sense. The collection controls are filter/sort
  widgets and the editor toolbar is a toolbar: both would be announced incorrectly to screen readers
  as an application menubar (`role="menubar"`), which implies Alt-key style menu semantics the UI
  does not have. The a11y change would be a regression, not an improvement.
- The one behavior Menubar would add that users could notice, hover-opening the next dropdown while
  one is open in the editor toolbar, does not justify the restructuring cost: each dropdown lives in
  an independent plugin component composed by `ToolbarPlugin`, and a shared `<Menubar>` ancestor
  would force those plugins to know about each other and constrain the plugin composition model
  (`src/ui/editor/Editor.tsx` mounts them conditionally per configuration).
- If grouped-widget keyboard semantics are ever wanted for the editor toolbar, Base UI's Toolbar
  component (also shipped in 1.6.0, `node_modules/@base-ui/react/toolbar`) is the semantically
  correct primitive for that job, not Menubar. That would be a separate evaluation.

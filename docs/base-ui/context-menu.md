# Context Menu

Status: rejected

Base UI's Context Menu (`@base-ui/react/context-menu`) opens a menu at the pointer position on
right-click / long-press. In the installed version (1.6.0) it consists of just `ContextMenu.Root`
and `ContextMenu.Trigger`; every other part (Portal, Positioner, Popup, Item, CheckboxItem,
RadioItem, SubmenuRoot, Separator, ...) is re-exported from Menu
(`node_modules/@base-ui/react/context-menu/index.parts.d.ts`), so it shares all styling and behavior
with the Menu wrappers the repo already has.

## Current state in this repo

There are zero imports of `@base-ui/react/context-menu`. The repo has exactly two right-click
behaviors, both inside the Lexical richtext editor:

- `src/ui/editor/plugins/ContextMenuPlugin.tsx:25-147`: the editor's node context menu (Remove Link,
  Cut, Copy, Paste, Paste as Plain Text, Delete Node). It is built on Lexical's own
  `NodeContextMenuPlugin` / `NodeContextMenuOption` from
  `@lexical/react/LexicalNodeContextMenuPlugin` (lines 4-8), mounted from
  `src/ui/editor/Editor.tsx:421` behind the `pluginItems.contextMenu` flag.
- `src/ui/editor/editor-ui/ImageComponent.tsx:327-328`: a raw `contextmenu` listener that dispatches
  `RIGHT_CLICK_IMAGE_COMMAND` so right-clicking an image selects its node first. It shows no menu
  itself; the menu that then appears is the plugin above.

Everywhere else (collection lists, media library, workflow board, dashboards) the CMS deliberately
leaves the browser's native context menu alone.

## Motivation for rejection

- The only real context menu is Lexical's, and it is not a candidate for replacement.
  `NodeContextMenuPlugin` resolves which Lexical node was right-clicked and feeds it to per-item
  `$showOn(node)` predicates (e.g. "Remove Link" only over link nodes, `ContextMenuPlugin.tsx:34`)
  and `$onSelect` editor commands. Rebuilding that on `ContextMenu.Root` would mean reimplementing
  Lexical's DOM-to-node hit testing and selection synchronization by hand for zero user-visible
  gain, and it would drift from upstream Lexical playground code the plugin is derived from.
- Outside the editor there is no use case: content lists and media cards act on left-click/buttons,
  and hijacking right-click on ordinary CMS chrome hides the browser menu (copy link address, open
  in new tab) that editors actually use.
- If a genuine need appears later (e.g. entry-row actions on the Laika dashboard), the cost of
  adoption is low: because Context Menu reuses Menu's parts, the existing styled wrappers in
  `src/ui/DropdownMenu.tsx` (item, separator, checkbox item styling) apply as-is; only Root and
  Trigger differ. Nothing needs to be prepared in advance for that.

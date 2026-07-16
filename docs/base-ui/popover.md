# Popover

Status: used

Base UI's Popover (`@base-ui/react/popover`) is an accessible, anchored popup opened by a button:
`Popover.Root`, `Popover.Trigger`, `Popover.Portal`, `Popover.Positioner`, `Popover.Popup`, plus
optional `Title`, `Description`, `Arrow`, `Backdrop`, and `Close` parts. It handles anchored
positioning (side/align/offset, collision handling), focus management, dismissal, and popover ARIA
wiring. The repo has one wrapper and two consumers, both inside the richtext editor.

## Where it is used

- `src/ui/Popover.tsx:2`: the design-system wrapper. `Popover` re-exports Root (lines 7-11),
  `PopoverTrigger` the trigger (line 13), and `PopoverContent` composes Portal + Positioner + Popup
  (lines 36-61) with `align` / `side` / `sideOffset` and, notably, the Positioner's `anchor` prop
  passed through (lines 41-51), which lets content anchor to an arbitrary element or virtual element
  instead of the trigger. `PopoverHeader`, `PopoverTitle`, and `PopoverDescription` are plain styled
  divs/p (lines 70-99). Exported through the barrel at `src/ui/index.ts:15`.

Consumers:

- `src/ui/editor/editor-ui/DateTimeComponent.tsx:23,184-235`: the richtext date-time node's editing
  UI; the trigger renders the formatted date chip and the content hosts the calendar plus the
  "include time" checkbox.
- `src/ui/editor/plugins/embeds/AutoEmbedPlugin.tsx:19,256-282`: the auto-embed suggestion popup. It
  runs the root controlled-open (`open={true}`) and anchors the content to the Lexical-computed
  target element via the `anchor` passthrough, showing the "embed this URL" menu next to the pasted
  link.

## Motivation

The primitive is adopted and there is nothing left to migrate onto it: an audit of the rest of the
codebase found no hand-rolled click-triggered popovers. Floating UI in the classic and Laika shells
is either a menu (see `docs/base-ui/menu.md`), a dialog (`docs/base-ui/dialog.md`), a tooltip
(`docs/base-ui/tooltip.md`), or the richtext editor's own selection-driven floating toolbars, which
are positioned by Lexical off the text selection rather than a trigger element and stay
Lexical-managed on purpose. Usage stays scoped to `src/ui` + editor for now; if the Laika shell
grows popover needs (e.g. inline help), it should follow the `LaikaTooltip`/`LaikaDialog` pattern of
a local wrapper over the same primitive rather than importing across layers.

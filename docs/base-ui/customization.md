# Customization

Status: used

The Base UI handbook page "Customization" (handbook/customization) is a cross-cutting guide, not a
component. It covers three mechanisms: Base UI change events with an `eventDetails` second argument
(`reason`, `cancel()`, `allowPropagation()`), the `preventBaseUIHandler()` escape hatch on React
events, and controlling components with external state via `open`/`onOpenChange` and
`value`/`onValueChange`.

## How this repo applies the guide

### Controlled components (the main pattern, used everywhere)

The repo relies heavily on the "controlling components with state" pattern. All dialog-like
primitives are controlled by app state rather than left uncontrolled:

- `src/core/components/UI/Modal.tsx:71` controls `Dialog.Root` with an `isOpen` prop and maps
  `onOpenChange(false)` to a legacy `onClose()` callback. The doc comment there explains that focus
  trap, Escape, outside-click dismissal, and scroll lock all come from Base UI.
- `src/laika-app/ui/LaikaDialog.tsx:117-124` does the same `isOpen`/`onClose` adaptation for the
  Laika shell.
- `src/ui/AlertDialog.tsx:213-216` renders a queued alert with `open` (always true while queued) and
  dismisses via `onOpenChange` when the user closes it.
- `src/laika-app/LaikaSidebar.tsx:323-330` controls `Drawer.Root` for the mobile sidebar
  (`isMobileSidebarOpen` + `closeMobileSidebar`).
- Widgets control `Collapsible.Root` from field state:
  `src/widgets/object/ObjectControl.tsx:262-266` (`open={!collapsed}` with `onOpenChange`) and
  `src/widgets/list/ListControl.tsx:722` (per-item collapse toggles).
- Value-style change events are also controlled: `src/ui/Select.tsx:16` wraps `onValueChange`,
  `src/ui/ToggleGroup.tsx:79-84` adapts the group `string[]` value to a single-value API for
  `type="single"` callers, and `src/ui/Tabs.tsx` forwards `onValueChange`.

### Behavior customization via root props instead of eventDetails

Where the repo needs to deviate from default popup behavior it uses root-level props rather than
canceling events: `src/ui/default/Dropdown.tsx:211` passes `modal={false}` to `Menu.Root` to
preserve the old react-aria-menubutton behavior (page keeps scrolling, no scrim).

### What the repo does NOT use (yet)

Grepping `src/` finds no use of the `eventDetails` second argument, `reason`, `cancel()`,
`allowPropagation()`, or `preventBaseUIHandler()`. Every `onOpenChange`/`onValueChange` handler
takes only the first argument.

Two wrapper details are worth knowing when this becomes relevant:

- `src/ui/Dialog.tsx:19` narrows the handler type to `(open: boolean) => void` and
  `src/ui/Dialog.tsx:26` calls `onOpenChange?.(nextOpen)`, deliberately dropping `eventDetails`.
  `src/ui/Select.tsx:11-16` similarly re-types `onValueChange` as `(value: string) => void`.
- Consumers of these wrappers therefore cannot inspect `reason` or call `cancel()` today. If a
  future feature needs it (the classic candidates in this codebase are "confirm before closing an
  editor dialog with unsaved changes" or "keep a parent menu open when a nested popup handles
  Escape"), the wrappers should forward the second argument instead of adding external state guards,
  since `eventDetails.cancel()` lets the component stay uncontrolled.

## Summary

The controlled-state half of the guide is the repo's standard idiom for dialogs, drawers,
collapsibles, selects, tabs, and toggle groups. The `eventDetails`/`preventBaseUIHandler` half is
currently unused, and the `src/ui` wrappers erase it from their types; forwarding `eventDetails`
through `src/ui/Dialog.tsx` and `src/ui/Select.tsx` is the natural first step if reason-based or
cancelable behavior is ever needed.

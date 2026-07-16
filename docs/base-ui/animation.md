# Animation

Status: used

The Base UI animation handbook describes three approaches for animating open/close of Base UI
components: CSS transitions via the `[data-starting-style]` / `[data-ending-style]` hooks
(recommended), CSS keyframe animations via `[data-open]` / `[data-closed]`, and JavaScript animation
libraries (Motion) via the `render` prop plus `keepMounted`.

This repo uses the first, recommended approach: Emotion-styled Base UI parts with
`&[data-starting-style], &[data-ending-style]` selectors that define the hidden state, and a plain
CSS `transition` on the visible state. Base UI then waits for the transition to finish before
unmounting, so exit animations play without any extra lifecycle code.

## Where it is used

- `src/core/components/UI/Modal.tsx:21` styles `Dialog.Backdrop`: the visible state has `opacity: 1`
  plus a `transition` on `background-color` and `opacity`, and the `[data-starting-style]` /
  `[data-ending-style]` block (lines 29-33) sets both to zero, giving the classic fade in/out of the
  dark overlay. The file's header comment (lines 12-13) explicitly documents that the fade is driven
  by these Base UI transition hooks.
- `src/core/components/UI/Notifications.tsx:83` animates `Toast.Root` in the classic shell: toasts
  transition `transform` and `opacity` over 0.3s, and the starting/ending style is
  `opacity: 0; transform: translateX(110%)`, a slide-in from the right that reverses on dismiss.
- `src/laika-app/LaikaNotifications.tsx:93` does the same slide/fade for the Laika shell's toast
  styling (shared `toastStyles` helper, same attribute selectors).
- `src/laika-app/LaikaSidebar.tsx` animates the mobile navigation drawer built on
  `@base-ui/react/drawer`:
  - `MobileBackdrop` (line 84) fades opacity over 0.2s with the starting/ending block at lines
    95-98.
  - `MobilePanel` (line 112) slides with `transition: transform 0.2s ease` and
    `transform: translateX(-100%)` in the starting/ending block (lines 124-127).
  - `Drawer.Portal keepMounted` (line 335) keeps the panel in the DOM while closed, matching the
    handbook's guidance for elements whose state must persist (here the panel carries a
    `data-mobile-open` flag used by swipe handling).

## What is intentionally not used

- No JavaScript animation library: `motion/react` / `AnimatePresence` do not appear anywhere in
  `src/`. All open/close animation is CSS-transition based, which is also the handbook's own
  recommendation (cancelable midway, no abrupt jumps).
- No `[data-open]` / `[data-closed]` keyframe animations on Base UI parts. The only Emotion
  `keyframes` tied to visibility live in `src/ui/default/Loader.tsx` (fade in/out of the loading
  overlay), which is a hand-rolled component, not a Base UI popup.
- No `actionsRef` manual unmounting; nothing in the repo needs that level of control.

## Gaps and possible extensions

Several popup wrappers mount and unmount with no transition at all. If subtle open/close motion is
wanted later, the pattern above drops in with a few lines of Emotion CSS on the Popup part (plus
`transform-origin: var(--transform-origin)` for scale effects):

- `src/ui/DropdownMenu.tsx`, `src/ui/Popover.tsx`, `src/ui/Select.tsx`, `src/ui/Tooltip.tsx`,
  `src/ui/Dialog.tsx`, `src/ui/AlertDialog.tsx`: the design-system wrappers style their Popup parts
  but define no starting/ending styles (the `transition` in `src/ui/Select.tsx:60` is a hover/focus
  transition on the trigger, not an open/close animation).
- `src/laika-app/ui/LaikaDialog.tsx` and `src/laika-app/ui/LaikaTooltip.tsx` likewise appear and
  disappear instantly.
- `src/widgets/list/ListControl.tsx:750` uses `Collapsible.Panel keepMounted` with only a
  `[hidden] { display: none }` rule (line 87), so list items snap open/closed; Base UI's collapsible
  height variables would allow a smooth expand/collapse if desired.

None of these gaps are bugs; they are deliberate no-animation defaults. The important point is that
the codebase already follows the handbook's recommended CSS-transition technique wherever animation
exists, so new animated popups should copy the Modal/Sidebar pattern rather than introduce a JS
animation dependency.

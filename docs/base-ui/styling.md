# Styling

Status: used

The Base UI handbook page "Styling" (handbook/styling) is not a component; it describes how to
attach your own styling engine to Base UI's unstyled parts via `className`/`style` props, state data
attributes, and exposed CSS variables. This repo follows the handbook's CSS-in-JS route with
Emotion, and its house rules are codified in `src/ui/README.md` (the "Styling contract" section)
plus `src/ui/styled.ts`.

## How the repo applies the guide

### CSS-in-JS with Emotion, two flavors

- The css prop (preferred in `src/ui/` primitives). Files start with the
  `/** @jsxImportSource @emotion/react */` pragma and pass `css={...}` styles directly to Base UI
  parts. Example: `src/ui/DropdownMenu.tsx` puts `contentClass` on `MenuPrimitive.Popup`
  (src/ui/DropdownMenu.tsx:74) and `itemClass` on `MenuPrimitive.Item`
  (src/ui/DropdownMenu.tsx:158). A caller-supplied `className` is passed through separately; Emotion
  merges the css prop with it.
- `styled()` wrapping of Base UI parts, exactly the handbook's CSS-in-JS example. Examples:
  `styled(Menu.Trigger)` / `styled(Menu.Popup)` / `styled(Menu.Item)` in
  `src/laika-app/LaikaHeader.tsx:205-253` and `src/ui/default/Dropdown.tsx:32-126`, and
  `styled(Switch.Root)` / `styled(Switch.Thumb)` in `src/laika-app/ui/LaikaToggleSwitch.tsx:27,59`.
  The `styled()` variants use `laikaShouldForwardProp` (src/ui/styled.ts:69) so custom variant props
  do not leak onto the DOM element.

### Data attributes for state

Component state is styled through Base UI's data attributes rather than JS conditionals:

- `[data-highlighted]` and `[data-disabled]` on menu and select items: src/ui/DropdownMenu.tsx:115,
  src/ui/Select.tsx:263, src/ui/default/Dropdown.tsx:109, src/laika-app/LaikaCommandPalette.tsx:77.
- `[data-checked]` on the switch thumb/track: src/laika-app/ui/LaikaToggleSwitch.tsx:45,74.
- `[data-popup-open]` on the quick-add trigger: src/laika-app/LaikaHeader.tsx:224.
- `[data-starting-style]` / `[data-ending-style]` drive enter/exit transitions for popups, the modal
  overlay, drawers, and toasts: src/core/components/UI/Modal.tsx:29-30 (the file header comment at
  lines 12-13 documents this as the intended animation hook),
  src/core/components/UI/Notifications.tsx:83-84, src/laika-app/LaikaNotifications.tsx:93-94,
  src/laika-app/LaikaSidebar.tsx:95-125.

### CSS variables

Popup sizing uses the variables Base UI exposes on positioned popups:

- `max-height: var(--available-height)` in src/ui/DropdownMenu.tsx:46 and src/ui/Select.tsx:121.
- `min-width: var(--anchor-width)` in src/ui/default/Dropdown.tsx:82 so the menu matches its trigger
  width.

### Typing the `className` prop

Base UI's `className` also accepts a state callback. The repo deliberately narrows it away: the
`WithClassName<P>` helper (src/ui/styled.ts:79) rewrites a wrapped part's props so `className` is a
plain `string`, keeping it mergeable with `cx` and with Emotion's css prop. No call site uses the
`className={(state) => ...}` or `style={(state) => ...}` function forms; state styling goes through
data attributes instead, which is the more declarative of the handbook's options.

## House deviations from the handbook examples

- No Tailwind and no CSS Modules (explicitly ruled out in src/ui/README.md).
- Variant-driven styles use the local cva-style `variants()` helper (src/ui/styled.ts:36) that
  returns `SerializedStyles[]` for the css prop, not class names.
- Theme values come from CSS custom properties and the legacy tokens in `src/ui/default/styles.tsx`
  (e.g. `var(--popover)`, `var(--accent)`), not hardcoded colors.
- Inline `style={{}}` is discouraged for anything variant-driven.

## Where to look when adding styling

Copy the pattern from an existing layer-1 primitive: css prop plus `WithClassName`, data-attribute
selectors for state, Base UI CSS variables for popup sizing, and `data-starting-style` /
`data-ending-style` for transitions. `src/ui/DropdownMenu.tsx` and `src/ui/Select.tsx` are the
reference implementations.

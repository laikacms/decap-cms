# Composition

Status: used

The Base UI composition handbook describes one core pattern: every Base UI part accepts a `render`
prop that either swaps in a custom React element (which must forward `ref` and spread its props) or
changes the rendered tag entirely. This repo relies on that pattern heavily, in two complementary
flavors: passing Emotion-styled components to `render`, and wrapping parts with `styled()` directly
(which is equivalent, since Base UI parts accept `className`).

## Pattern 1: `render` with a custom element

Used wherever a Base UI trigger or slot must render an existing house component:

- `src/ui/Dialog.tsx:39` and `src/ui/Dialog.tsx:56`: `DialogTrigger` and `DialogClose` expose a
  Radix-style `asChild` prop and translate it to Base UI composition internally, e.g.
  `<DialogPrimitive.Trigger ref={ref} render={children as RenderElement} {...props} />`. This keeps
  call sites (ported from the old shadcn-style API) unchanged while the underlying mechanism is the
  handbook's `render` prop.
- `src/ui/default/Toggle.tsx:98`: the legacy `Toggle` renders the Base UI `Switch` through
  `render={<Container />}` so the swappable `Container`/`Background`/`Handle` styled components
  (used by `BooleanControl`) keep their exact visual output while gaining Switch semantics.
- `src/ui/default/ObjectWidgetTopBar.tsx:133` and `src/ui/default/ListItemTopBar.tsx:84`:
  `Collapsible.Trigger render={<ExpandButton />}` / `render={<TopBarButton ... />}` give the object
  and list widgets their classic expand buttons with Base UI collapse wiring.
- `src/laika-app/ui/LaikaTooltip.tsx:45`: `<Tooltip.Trigger delay={0} render={children} />` composes
  the tooltip onto whatever single child element the caller passes, exactly the "composing custom
  React components" case from the handbook.
- `src/laika-app/LaikaCommandPalette.tsx:311`: `<Autocomplete.Input render={<LaikaSearchInput />}>`
  swaps the palette's styled search field into the Autocomplete input slot.
- `src/ui/Select.tsx:106`: `<SelectPrimitive.Icon render={<ChevronDownIcon ... />} />` replaces the
  icon slot with a lucide icon styled via the Emotion `css` prop.

## Pattern 2: changing the rendered element

- `src/laika-app/LaikaSidebar.tsx:339`: the mobile drawer panel uses `render={<aside />}` on a
  `styled(Drawer.Popup)` so the off-canvas sidebar stays an `<aside>` landmark, matching the
  handbook's "changing the default rendered element" section.

## Pattern 3: `styled()` around Base UI parts

Because Base UI parts merge `className`, Emotion's `styled()` composes with them without any
`render` indirection. This is the dominant styling approach for Laika and the default theme:

- `src/ui/default/Dropdown.tsx:32-126`: `styled(Menu.Trigger)`, `styled(Menu.Positioner)`,
  `styled(Menu.Popup)`, `styled(Menu.Item)`, `styled(Menu.CheckboxItem)`.
- `src/laika-app/LaikaSidebar.tsx:84-112`: `styled(Drawer.Backdrop/Viewport/Popup)`.
- `src/laika-app/LaikaCommandPalette.tsx:53-117`: `styled(Autocomplete.List/Item/Empty)`.
- `src/laika-app/LaikaHeader.tsx:205-253`: styled `Menu.*` parts for the quick-add menu.
- `src/laika-app/ui/LaikaTooltip.tsx:21-25`, `LaikaAvatar.tsx:25-43`, `LaikaToggleSwitch.tsx:27-59`:
  styled `Tooltip.*`, `Avatar.*`, `Switch.*` parts, using `laikaShouldForwardProp` to keep transient
  `$`-props off the DOM.

## Notes and gaps

- The handbook's function form of `render` (`render={(props, state) => ...}`) is not used anywhere
  in `src/`; all call sites pass elements. That is fine at current scale, but it is the tool to
  reach for if a slot ever needs state-dependent markup (e.g. a Switch thumb that swaps icons on
  `state.checked`).
- Deeply nested `render` chains (Tooltip wrapping Dialog wrapping Menu triggers) are not yet needed;
  `LaikaTooltip` takes a single child, so if a tooltip ever wraps a `Dialog.Trigger` the
  nested-render recipe from the handbook applies directly.
- The `asChild` shim in `src/ui/Dialog.tsx` is a deliberate compatibility layer; new code should
  prefer passing `render` straight through rather than adding more `asChild` surfaces.

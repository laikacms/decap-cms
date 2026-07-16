# Collapsible

Status: used

Base UI's Collapsible (`@base-ui/react/collapsible`) is an unstyled panel toggled by a button, with
three parts: `Collapsible.Root` (owns open state), `Collapsible.Trigger` (the button, gets
`aria-expanded`/`aria-controls` wiring for free), and `Collapsible.Panel` (the content, hidden via
the `hidden` attribute when closed).

This repo uses it as the collapse mechanism for the object and list field widgets. There is no
dedicated wrapper component in `src/ui`; instead the raw parts are composed directly, with two
`src/ui/default` top-bar components acting as reusable triggers.

## Where it is used

### Trigger side: src/ui/default

- `src/ui/default/ObjectWidgetTopBar.tsx:130` renders the expand/collapse chevron as a
  `Collapsible.Trigger` when the `collapsibleTrigger` prop is set, using the `render` prop to
  compose it with the Emotion-styled `ExpandButton`. When the prop is off it falls back to a plain
  button with `onCollapseToggle` (used by ListControl's list-level header, which manages "collapse
  all" state itself rather than a single panel).
- `src/ui/default/ListItemTopBar.tsx:83` does the same for list items: in `collapsibleTrigger` mode
  the chevron is a `Collapsible.Trigger` rendered through the styled `TopBarButton`, otherwise a
  plain `onCollapseToggle` button.

Both files document the contract in their prop types: `collapsibleTrigger` requires an enclosing
`Collapsible.Root`, and `onCollapseToggle` is ignored in that mode.

### Root and Panel side: src/widgets

- `src/widgets/object/ObjectControl.tsx:262-284`: the standalone object widget wraps itself in a
  controlled `Collapsible.Root` (`open={!collapsed}`, `onOpenChange={open => setCollapsed(!open)}`),
  puts `ObjectWidgetTopBar` with `collapsibleTrigger` inside it, and renders the fields in a
  `Collapsible.Panel keepMounted`. When rendered as a list item shell (`forList`) it skips the
  Collapsible entirely; the parent ListControl owns the collapse state.
- `src/widgets/list/ListControl.tsx:722-772`: each list item is a controlled `Collapsible.Root`
  (`open={!collapsed}`, `onOpenChange` toggles the per-index `itemsCollapsed` state) containing a
  `StyledListItemTopBar collapsibleTrigger` as the trigger and a `Collapsible.Panel keepMounted`
  holding the nested `ObjectControl`.

## Props and styling relied on

- Controlled mode only: `open` + `onOpenChange`; the widgets keep collapse state in their own React
  state (persisted per item index in ListControl).
- `keepMounted` on `Collapsible.Panel`: field inputs stay mounted while collapsed so values,
  validation, and nested control refs survive collapse.
- Because `keepMounted` leaves the panel in the DOM with `hidden`, both call sites add an Emotion
  rule `&[hidden] { display: none; }` (inline in ObjectControl, `styles.collapsiblePanel` at
  `src/widgets/list/ListControl.tsx:86`). No open/close animation is used, so the
  `--collapsible-panel-height` variable and `data-starting-style`/`data-ending-style` hooks from the
  docs are not needed.
- Composition via `render`: triggers are Emotion styled-components passed to
  `Collapsible.Trigger render={...}`, keeping the existing visual design while gaining the
  accessibility wiring.

## Tests

`src/widgets/list/__tests__/ListControl.spec.tsx:18` mocks `ListItemTopBar` but keeps a real
`Collapsible.Trigger` (with `nativeButton={false}` around a mock element) so the specs exercise the
actual Root/Trigger/Panel interaction rather than a fake toggle.

## Notes

The list widget's top-level header (collapse all items) intentionally does not use Collapsible: it
toggles many item panels at once via `handleCollapseAllToggle`
(`src/widgets/list/ListControl.tsx:826`), which does not map to a single Root/Panel pair. That is
why the top-bar components keep their non-collapsible fallback mode.

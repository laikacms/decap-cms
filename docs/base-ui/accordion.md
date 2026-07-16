# Accordion

Status: proposed

`@base-ui/react/accordion` is not imported anywhere in `src/`. The only grep hit for "accordion" is
an emoji name in `src/ui/editor/utils/emoji-list.ts`. The repo covers all of its expand/collapse
needs with the sibling primitive, `@base-ui/react/collapsible`, which has 4 direct imports.

## What the repo does instead

All collapse behavior is built from single `Collapsible.Root` instances, one per collapsible region:

- `src/widgets/object/ObjectControl.tsx:262`: the object widget wraps its fields in a
  `Collapsible.Root` with `keepMounted` panel, header rendered by `ObjectWidgetTopBar`.
- `src/widgets/list/ListControl.tsx:722`: each list item is its own `Collapsible.Root`
  (`open={!collapsed}` driven by an `itemsCollapsed` index map), inside a `SortableListItem`
  drag-and-drop wrapper.
- `src/ui/default/ObjectWidgetTopBar.tsx` and `src/ui/default/ListItemTopBar.tsx`: the shared
  top-bar primitives render the chevron as a `Collapsible.Trigger` when a `collapsibleTrigger` flag
  is set, so they must live inside an enclosing `Collapsible.Root`.

For a single panel (the object widget) Collapsible is the correct Base UI choice; Accordion would
add nothing there.

## Where Accordion could be adopted

`src/widgets/list/ListControl.tsx` renders a vertical stack of sibling collapsible panels with
headings: structurally, that is exactly what `Accordion.Root` models. A migration would look like:

- `Accordion.Root openMultiple` with a controlled `value` array built from the widget's stable item
  keys (the `keys[index]` array already used as React keys), replacing the hand-rolled
  `itemsCollapsed` boolean map and the per-item `onOpenChange` plumbing.
- Each `SortableListItem` would contain an `Accordion.Item` whose `Accordion.Header` /
  `Accordion.Trigger` maps onto the existing `ListItemTopBar` chevron, and whose
  `Accordion.Panel keepMounted` replaces the current `Collapsible.Panel`.
- The list widget's "collapse all" toggle (`minimize_collapsed` behavior surfaced through
  `ObjectWidgetTopBar`) becomes a one-line `setValue([])` / `setValue(allKeys)` on the controlled
  root instead of rewriting the index map.

Concrete benefits:

- Accessibility: `Accordion.Root` gives roving focus between item headers (Arrow keys, Home, End)
  for free. Today each item is an isolated Collapsible, so keyboard users must Tab through every
  item header and its inline buttons to reach the next one; long lists are tedious to traverse.
- State simplification: one controlled `value: string[]` keyed by stable item keys instead of an
  index-keyed boolean map that must be re-shuffled on drag-and-drop reorder, item add, and item
  delete.
- Animation: the `--accordion-panel-height` CSS variable enables a height transition on
  expand/collapse, which the current panels do not have.

## Caveats

- The Collapsible-per-item shape was chosen deliberately in the recent widgets refactor, and the
  shared `ListItemTopBar` trigger contract (`src/ui/default/ListItemTopBar.tsx:56`) would need a
  parallel Accordion mode or a swap to `Accordion.Trigger`.
- Drag-and-drop reordering must keep working: `Accordion.Item` inside `SortableListItem` is fine
  structurally, but focus behavior during drag should be re-verified with the `verify` skill.
- This is a net-neutral change in code size; the payoff is keyboard a11y and simpler open state, not
  deletion of large amounts of code.

## Places checked and ruled out

- `src/laika-app/LaikaSidebar.tsx`: collection groups use static `SidebarSection` headings, nothing
  collapses.
- `src/core/components/Collection/NestedCollection.tsx`: an expandable tree with selection
  semantics, not an accordion; Accordion's flat item model does not fit nesting.
- `src/core/components/Editor/EditorInterface.tsx`: "collapse" there refers to the split-pane
  percentage, not a disclosure widget.
- `src/laika-app/LaikaSettingsPage.tsx`: plain sections, no disclosure behavior.

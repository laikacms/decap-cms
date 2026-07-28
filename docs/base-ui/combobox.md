# Combobox

Status: proposed

Base UI's Combobox (`@base-ui/react/combobox`) is an unstyled input-plus-listbox for selecting from
predefined items with filtering. Unlike Autocomplete it restricts the value to the item set (free
text is only a filter), and unlike Select it filters as you type. It supports `multiple` selection
rendered as removable chips (`Chips`/`Chip`/`ChipRemove`), async loading by swapping the `items`
prop from `onInputValueChange`, and manual filtering via `filter={null}`. Parts: `Root`,
`InputGroup`/`Input`/`Trigger`/`Clear`, `Portal`/`Positioner`/`Popup`,
`List`/`Item`/`ItemIndicator`, `Chips`, `Empty`, `Value`.

## Current state in this repo

There are zero imports of `@base-ui/react/combobox`. The combobox-shaped UIs are:

- `src/widgets/relation/RelationControl.tsx:2-5`: the relation widget uses `react-select/async`
  (`AsyncSelect`) with `react-window`'s `List` for a virtualized menu, a custom sortable
  `MultiValue` chip built from `SortableArea`/`SortableItem` (`RelationControl.tsx:49-80`),
  debounced backend queries through `RelationCache`, and `reactSelectStyles` theming from
  `@/ui/default`. This is exactly Combobox's problem space: async filterable options, multiple
  selection with chips, restricted values.
- `src/widgets/select/SelectControl.tsx:3`: the select widget uses plain `react-select` (static
  options, optional `isMulti`, min/max validation). A simpler Combobox (or, for the non-searching
  single case, Base UI Select) candidate.
- The Cmd+K command palette already uses Base UI Autocomplete instead
  (`src/laika-app/LaikaCommandPalette.tsx:4`; see `docs/base-ui/autocomplete.md`). That is the right
  split: the palette accepts free-text queries and synthesizes "search for X" actions, so
  Autocomplete's free-form semantics fit; the widgets bind entry values to a fixed option set, which
  is Combobox semantics.
- `src/ui/cmdk.tsx` / `src/ui/Command.tsx` (vendored `cmdk-base`) serve the Lexical typeahead
  plugins and stay out of scope, as documented in `autocomplete.md`.

## Proposed adoption

Migrate the two `react-select` widgets to Base UI Combobox, dropping the `react-select` dependency
(and likely `react-window`, whose only consumer is `RelationControl.tsx:5`):

1. `SelectControl` first: static `options` map directly to `items`; `multiple` maps to `isMulti`;
   chips replace `react-select` multi-value pills; `value`/`onValueChange` replace the option-object
   round-tripping in `getSelectedValue`/`optionToString`. Small surface, existing specs in
   `src/widgets/select/__tests__/` pin behavior.
2. `RelationControl` second: `onInputValueChange` triggers the existing debounced `RelationCache`
   query and feeds results into `items` with `filter={null}` (the backend already filters);
   `multiple` plus a custom `Chips` render wrapped in `SortableArea`/`SortableItem` preserves
   drag-reordering; `Combobox.List` can render a windowed subset if the current virtualization is
   still needed.

Why not done now: this is a behavioral rewrite of two config-driven widgets with a wide
compatibility surface (string vs object option values, `multiple` with `min`/`max` validation, i18n
hit mapping, entry-draft value shapes, paginated `loadOptions`, drag sorting) that is covered by
widget specs and e2e flows. It is multi-day work, not a low-risk swap, and there is no forcing
function to do it in this pass.

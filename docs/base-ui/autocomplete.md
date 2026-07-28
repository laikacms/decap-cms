# Autocomplete

Status: used

Base UI's Autocomplete (`@base-ui/react/autocomplete`) is an unstyled combobox primitive: an input
plus a filtered listbox, with full combobox a11y (aria-expanded, aria-activedescendant), keyboard
navigation, highlight management, and scroll-into-view. Parts: `Root`, `Input`,
`Portal`/`Positioner`/`Popup` (for popup mode), `List`, `Item`, `Empty`.

## Where it is used

Single call site: the Cmd+K / Ctrl+K global command palette in the new Laika shell.

- `src/laika-app/LaikaCommandPalette.tsx:4` imports `Autocomplete` directly; there is no `src/ui`
  wrapper. The palette is a pure laika-app component that composes the Base UI parts with the local
  `LaikaDialog`, `LaikaSearchInput`, and `LaikaBadge` primitives from `src/laika-app/ui`.
- Tested in `src/laika-app/__tests__/LaikaCommandPalette.spec.tsx`, which asserts the combobox
  wiring Base UI provides over the inline list.

## How it is composed

The palette uses the inline (non-popup) configuration, so `Portal`/`Positioner`/`Popup` are not used
at all. On `Autocomplete.Root` (`LaikaCommandPalette.tsx:292`):

- `inline` and `open`: the listbox renders inline inside the dialog and is forced open; the only
  close Base UI can request is Escape, which the `onOpenChange` handler turns into dismissing the
  whole palette.
- `mode="none"`: filtering stays in app code. A ranked `filtered` array (nav items plus synthesized
  "search for <query>" actions, `LaikaCommandPalette.tsx:236`) is passed via `items`, and
  `value`/`onValueChange` keep the query string in local state.
- `autoHighlight="always"` and `keepHighlight`: the first result is always highlighted so Enter runs
  it immediately.

Parts in use:

- `Autocomplete.Input` with the `render` prop swapping in `LaikaSearchInput`
  (`LaikaCommandPalette.tsx:310`), so Base UI attaches its combobox behavior to the existing styled
  search input instead of rendering its own element.
- `Autocomplete.List` with a function child that renders each `CommandItem`
  (`LaikaCommandPalette.tsx:318`).
- `Autocomplete.Item` with `value={item}` and an `onClick` that runs the command and closes the
  palette.
- `Autocomplete.Empty` for the "No matches." state. Per the comment at
  `LaikaCommandPalette.tsx:113`, the Empty part must stay mounted for screen-reader announcements,
  so its chrome is gated behind `&:not(:empty)`.

## Styling

Emotion `styled()` is applied directly to the parts: `Results = styled(Autocomplete.List)`,
`ResultItem = styled(Autocomplete.Item)`, `Empty = styled(Autocomplete.Empty)`
(`LaikaCommandPalette.tsx:53-124`). Highlight styling keys off Base UI's `[data-highlighted]`
attribute alongside `:hover`, using the shared `colors` tokens from `@/ui/default`.

## Related code, not Base UI Autocomplete

- `src/ui/cmdk.tsx` plus `src/ui/Command.tsx`: a vendored `cmdk-base` command primitive (itself Base
  UI flavored but hand-rolling the combobox role) used by the richtext editor's typeahead plugins
  (`src/ui/editor/plugins/ComponentPickerMenuPlugin.tsx`, `MentionsPlugin.tsx`,
  `EmojiPickerPlugin.tsx`, `embeds/AutoEmbedPlugin.tsx`). These sit inside Lexical's typeahead
  positioning, so they were not migrated with the palette.
- `src/ui/editor/plugins/AutoCompletePlugin.tsx` and `nodes/AutocompleteNode.tsx`: Lexical
  ghost-text completion inside the editor, unrelated to this component.

## Possible further adoption

`src/widgets/relation/RelationControl.tsx` and `src/widgets/select/SelectControl.tsx` still use
`react-select` (async, multi-value, virtualized via `react-window`). Base UI Autocomplete (or,
better for selection semantics, Combobox) is the natural replacement if `react-select` is ever
targeted for removal, but the multi-value, sortable, async-paginated behavior there makes that a
separate, larger effort.

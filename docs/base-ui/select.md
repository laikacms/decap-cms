# Select

Status: used

Base UI's Select (`@base-ui/react/select`) is an unstyled dropdown for picking one value from a
predefined list (no text filtering; that is Combobox territory). Its parts are `Root`,
`Trigger`/`Value`/`Icon`, `Portal`/`Positioner`/`Popup`, `ScrollUpArrow`/`ScrollDownArrow`,
`Group`/`GroupLabel`, `Item`/`ItemIndicator`/`ItemText`, and `Separator`. It handles listbox a11y,
typeahead, keyboard selection, and optional item-with-trigger alignment.

## Where it is used

The repo has a full shadcn-style wrapper in `src/ui/Select.tsx` (exported via `src/ui/index.ts:17`):

- `Select` (`src/ui/Select.tsx:8-20`): wraps `SelectPrimitive.Root`, narrowing `onValueChange` to
  `(value: string) => void` for consumers.
- `SelectTrigger` (`src/ui/Select.tsx:88-116`): styles the trigger and slots a `ChevronDownIcon`
  through `SelectPrimitive.Icon`'s `render` prop.
- `SelectContent` (`src/ui/Select.tsx:193-228`): composes `Portal` > `Positioner` > `Popup` and
  always mounts `SelectScrollUpButton` / `SelectScrollDownButton` (`src/ui/Select.tsx:149-189`);
  popup height uses Base UI's `--available-height` variable.
- `SelectItem` (`src/ui/Select.tsx:290-310`): `Item` with a `CheckIcon` inside `ItemIndicator` and
  text through `ItemText`; highlight styling keys off `[data-highlighted]`.
- Plus `SelectValue`, `SelectGroup`, `SelectLabel` (GroupLabel), `SelectSeparator`.

Production call sites, both in the richtext editor:

- `src/ui/editor/plugins/LayoutPlugin.tsx:27,56-70`: column-layout picker in the insert layout
  dialog (`items={LAYOUTS}`).
- `src/ui/editor/plugins/toolbar/CodeLanguageToolbarPlugin.tsx:15,75-89`: code block language picker
  in the toolbar (uses `finalFocus={false}` on the content so focus returns to the editor).

Tested in `src/ui/__tests__/popup-primitives.spec.tsx:13,42-57`, which exercises open, keyboard
selection, and `onValueChange` reporting.

## What deliberately does not use it

- The `select` and `relation` field widgets (`src/widgets/select/SelectControl.tsx:3`,
  `src/widgets/relation/RelationControl.tsx:2-5`) still render `react-select`, themed via
  `reactSelectStyles` from `@/ui/default`. They need multi-value chips, async option loading, and
  (for relation) virtualization and drag-sorting, which are Combobox-shaped features, not
  Select-shaped ones. See `docs/base-ui/combobox.md` for that migration proposal; swapping them to
  Base UI Select would lose search/filtering.
- The legacy classic-app dropdown (`src/ui/default/Dropdown.tsx`) is a Menu-based control (Base UI
  `Menu`), not a Select; it presents actions, not a bound form value, so Select is the wrong
  primitive there.

No further Select adoption is needed: every plain "pick one of N" popup in the new UI already goes
through the `src/ui/Select.tsx` wrapper.

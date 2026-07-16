# Tabs

Status: used

Base UI's Tabs (`@base-ui/react/tabs`) is an unstyled tabbed-panel primitive: `Tabs.Root` holds the
value state, `Tabs.List` manages roving focus and arrow-key navigation over `Tabs.Tab` triggers, and
`Tabs.Panel` shows the panel for the active value. It wires up the `tablist`/`tab`/`tabpanel` roles,
`aria-selected`, and `data-active`/`data-orientation` attributes, and supports controlled
(`value`/`onValueChange`) and uncontrolled (`defaultValue`) usage.

## Where it is used

The wrapper is `src/ui/Tabs.tsx` (exported via `src/ui/index.ts:20`):

- `Tabs` (`src/ui/Tabs.tsx:15-43`): wraps `TabsPrimitive.Root`, narrowing `onValueChange` to
  `(value: string) => void` and defaulting `defaultValue` to `''`.
- `TabsList` (`src/ui/Tabs.tsx:71-88`): wraps `TabsPrimitive.List` with `activateOnFocus` (arrow
  keys both move focus and switch panels) and two Emotion variants, `default` (pill on
  `var(--muted)`) and `line` (`tabsListVariants`, `src/ui/Tabs.tsx:55-69`).
- `TabsTrigger` (`src/ui/Tabs.tsx:132-146`): wraps `TabsPrimitive.Tab`; the active state styles
  through Base UI's `[data-active]` attribute.
- `TabsContent` (`src/ui/Tabs.tsx:154-168`): wraps `TabsPrimitive.Panel`.

Production call site:

- `src/ui/editor/extensions/ImagesExtension.tsx:32,170-181`: the richtext editor's insert image
  dialog, switching between a "URL" tab and a "File" upload tab (uncontrolled,
  `defaultValue="url"`).

Tested in `src/ui/__tests__/ui-primitives.spec.tsx:119-185`: only the active panel is in the DOM,
arrow keys move focus and activate tabs, and a controlled `value` reports changes through
`onValueChange` without switching on its own.

## Why no further adoption

There are no other hand-rolled tab UIs to migrate. The classic and Laika shells switch top-level
views through the router and sidebar navigation, not tab widgets; the editor toolbar groups are
toolbars (see `docs/base-ui/toggle-group.md`), not tabs; and the editor's rich-text/source view
switch is a toggle action (`src/ui/editor/plugins/actions/
SourceTogglePlugin.tsx`), where a tablist
role would be semantically wrong for a modal editor mode change. One production consumer plus spec
coverage is the expected footprint.

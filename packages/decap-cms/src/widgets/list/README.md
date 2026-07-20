# List widget

The list widget lets an entry hold an array of values — plain strings, or repeated groups of fields
when a `fields` (or single-field `field`) option is given.

## Config

```yaml
- { label: 'Tags', name: 'tags', widget: 'list' }
```

- `allow_add` (optional, default `true`) — whether new items can be added.
- `allow_remove` (optional, default `true`) — whether existing items can be removed. When `false`,
  each item's remove button is hidden (`ListItemTopBar.tsx`).
- `allow_reorder` (optional, default `true`) — whether existing items can be dragged into a new
  order. When `false`, each item's drag handle is hidden (`ListItemTopBar.tsx`).
- `collapsed` (optional, default `true`) — whether list items are collapsed by default.
- `minimize_collapsed` (optional, default `false`) — whether to render only the summary line for
  collapsed items.
- `summary` (optional) — template string used as the label for collapsed items. Supports
  `{{ field | filter }}` pipe syntax (`upper`, `lower`, `date()`, `default()`, `ternary()`,
  `truncate()`) — see
  [`src/lib/widgets/README.md#template-filters`](../../lib/widgets/README.md#template-filters).
- `min` (optional) — minimum number of items in the list.
- `max` (optional) — maximum number of items in the list.
- `label_singular` (optional) — label to use for an individual item, in place of the field's
  `label`.
- `i18n` (optional) — whether this field is translatable.
- `add_to_top` (optional, default `false`) — whether new items are inserted at the top of the list
  instead of the bottom. Source: `field.add_to_top ?? false` (`ListControl.tsx:475`).

## Structural modes: `field`, `fields`, `types`

The list widget has four mutually-exclusive structural modes, resolved in this order by
`getValueType()` (`ListControl.tsx:326-330`):

1. `fields` set → **multiple** — each item is an object holding the given fields.
2. else `field` set → **single** — each item holds a single value described by one field.
3. else `types` set → **mixed (variable types)** — each item is an object whose shape depends on its
   own `type`.
4. none set → **plain** — each item is a bare string (the default, original list behavior).

Only one of `fields` / `field` / `types` should be given per list field; if more than one is set,
whichever is checked first in that order wins.

### Plain list (no `field`/`fields`/`types`)

```yaml
- { label: 'Tags', name: 'tags', widget: 'list' }
```

Each item is a plain string. This is the default when none of `field`, `fields` or `types` are
configured.

### `field` — single-field items

```yaml
- label: 'Social'
  name: 'social'
  widget: list
  field: { label: 'URL', name: 'url', widget: 'string' }
```

Each item holds a single value, validated and rendered using the nested `field` definition instead
of a plain string. A new item's default comes from that field's own `default`, or `null` if it has
none (`singleDefault()`, `ListControl.tsx:459-461`).

### `fields` — multi-field (object) items

```yaml
- label: 'Links'
  name: 'links'
  widget: list
  fields:
    - { label: 'Title', name: 'title', widget: 'string' }
    - { label: 'URL', name: 'url', widget: 'string' }
```

Each item is an object holding all of the given `fields`. A new item's default is built from each
field's own `default` (`multipleDefault()` / `getFieldsDefault()`,
`ListControl.tsx:249-280,
463-464`); the collapsed-item label falls back to the first field's value
(`objectLabel()`, `ListControl.tsx:630-638`).

### `types` — variable-types (mixed) items

```yaml
- label: 'Page sections'
  name: 'sections'
  widget: list
  types:
    - label: 'Heading'
      name: 'heading'
      widget: object
      fields: [{ label: 'Text', name: 'text', widget: 'string' }]
    - label: 'Image'
      name: 'image'
      widget: object
      fields: [{ label: 'Src', name: 'src', widget: 'image' }]
```

Each item can be one of several shapes, picked from the `types` list when the item is added. The
"Add" button becomes a dropdown listing each type's `label` (or `name`); adding one seeds a default
object tagged with a type key so existing items can be matched back to their type (`handleAddType()`
/ `mixedDefault()`, `ListControl.tsx:466-472, 494-495`).

The tag key stored on each item defaults to `type`, but can be overridden per-list with `typeKey`
(`resolveFieldKeyType()`, `typedListHelpers.ts`):

```yaml
- label: 'Page sections'
  name: 'sections'
  widget: list
  typeKey: 'component'
  types: [...]
```

An item whose tag value doesn't match any entry in `types` (or that isn't an object at all) is
rendered as an error placeholder rather than crashing (`renderErroneousTypedItem()`,
`ListControl.tsx:763-786`).

### `min` and `max` are independently optional

`min` and `max` do not require each other — either one can be set on its own, or both can be set
together:

- only `min` — the list must contain at least `min` items; there's no upper bound.
- only `max` — the list may contain at most `max` items; there's no lower bound.
- both `min` and `max` — the list must contain between `min` and `max` items, inclusive.

Source: `validateMinMax` (`src/lib/widgets/validations.ts`) checks each bound independently rather
than treating them as a pair — setting one does not require the other to also be set. This is
exercised for the single-bound cases in `src/widgets/list/__tests__/ListControl.spec.tsx` ("should
give min validation error if below min elements", line 611, and "should give max validation error if
above max elements", line 655).

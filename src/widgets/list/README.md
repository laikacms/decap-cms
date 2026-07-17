# List widget

The list widget lets an entry hold an array of values — plain strings, or repeated groups of fields
when a `fields` (or single-field `field`) option is given.

## Config

```yaml
- { label: 'Tags', name: 'tags', widget: 'list' }
```

- `allow_add` (optional, default `true`) — whether new items can be added.
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

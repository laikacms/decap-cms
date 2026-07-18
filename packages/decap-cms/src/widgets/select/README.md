# Select widget

The select widget lets an entry hold a value chosen from a fixed list of options, via a
combobox/dropdown UI. It supports choosing a single value or multiple values.

## Config

```yaml
- label: 'Status'
  name: 'status'
  widget: 'select'
  options: ['draft', 'published']
```

- `options` (**required**) — the list of choices. See "Option formats" below. Source:
  `schema.ts` (`required: ['options']`).
- `multiple` (optional, default `false`) — allow selecting more than one value instead of a
  single value. Source: `schema.ts`.
- `min` (optional) — minimum number of selected options. Only enforced when `multiple: true` —
  see "`min` and `max` require `multiple: true`" below.
- `max` (optional) — maximum number of selected options. Only enforced when `multiple: true` —
  see "`min` and `max` require `multiple: true`" below.

## Option formats

Each entry in `options` may be either:

- a plain string or number, used as both the label and the value, or
- an object with `label` and `value` keys (`value` may be a string or number).

```yaml
- label: 'Status'
  name: 'status'
  widget: 'select'
  options:
    - 'draft'
    - 'published'
```

```yaml
- label: 'Status'
  name: 'status'
  widget: 'select'
  options:
    - { label: 'Draft', value: 'draft' }
    - { label: 'Published', value: 'published' }
```

Mixing string/number entries and `{ label, value }` object entries in the same `options` list is
allowed. Source: `schema.ts` (`options.items.oneOf`), `SelectControl.tsx` (`convertToOption()`).

## Single vs. `multiple`

By default (`multiple` unset or `false`) the field holds a single value — one of the values from
`options` — or `null` when nothing is selected. When `multiple: true`, the field holds an array of
values from `options` (`[]` when nothing is selected instead of `null`), and the control renders
selections as removable chips. Source: `SelectControl.tsx` (`getSelectedValue()`, `handleChange()`).

```yaml
- label: 'Tags'
  name: 'tags'
  widget: 'select'
  multiple: true
  options: ['a', 'b', 'c', 'd']
```

If the field is `required` and `multiple: true`, an unset value is normalized to `[]` (and a
non-array value is wrapped in an array) on mount rather than left as `null`/a bare scalar. Source:
`SelectControl.tsx` (the `React.useEffect` mount effect).

## `min` and `max` require `multiple: true`

`min` and `max` are only enforced when `multiple: true`. If `multiple` is not `true`, `min` and
`max` are silently ignored at runtime — the field still behaves as a single-select with no bounds,
and no validation error or warning is raised. Source: `SelectControl.tsx` (`isValid()` returns
`{ error: false }` immediately when `!field.multiple`, before `min`/`max` are ever checked).

`min` and `max` do not require each other when `multiple: true` — either one can be set on its
own, or both can be set together:

- only `min` — at least `min` options must be selected; there's no upper bound.
- only `max` — at most `max` options may be selected; there's no lower bound.
- both `min` and `max` — between `min` and `max` options (inclusive) must be selected.

Source: `validateMinMax` (`src/lib/widgets/validations.ts`) checks each bound independently
rather than treating them as a pair.

```yaml
- label: 'Tags'
  name: 'tags'
  widget: 'select'
  multiple: true
  min: 1
  max: 3
  options: ['a', 'b', 'c', 'd']
```

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

# decap-cms-widget-boolean

Boolean widget for [Decap CMS](https://decapcms.org). Renders as a switch-style
[`Toggle`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-ui-default)
component, not a checkbox — visually distinct from most other CMSs' boolean controls.

## Configuration options

| Option     | Type    | Default | Description |
|------------|---------|---------|-------------|
| `label`    | string  | Field `name` | Label for the field in the editor UI. |
| `name`     | string  | —       | Unique field identifier. |
| `default`  | boolean | `false` | Initial toggle state for a new entry. |
| `required` | boolean | `true`  | See [`required` and empty-value semantics](#required-and-empty-value-semantics) below. |
| `hint`     | string  | —       | Instructional text rendered under the field label in the editor UI. |

```yaml
- label: 'Featured'
  name: 'featured'
  widget: 'boolean'
  default: false
  hint: 'Show this post in the featured section on the homepage.'
```

### `default`

When a field has no `default`, the control initializes to `false` (unchecked/off) —
this comes from `BooleanControl.defaultProps.value`, not from any special-casing in the
core field-default logic. Set `default: true` to have new entries start with the toggle on.

### `required` and empty-value semantics

Decap CMS's built-in "required" check treats a value as missing if it's `null`,
`undefined`, an empty string/array, or an empty object/Map. A boolean `false` is none of
those — it's a real, present value — so it never trips the `required` validation error,
regardless of whether `required` is `true` or `false`. In practice this means a required
boolean field can be safely left toggled off; it will never block saving an entry with a
"this field is required" error. This is a common point of confusion for authors used to
`required` on string or number widgets, where an empty value *does* fail validation.

If you need to force an editor to make an explicit choice (rather than defaulting to
`false`/off), use a [`select`](../decap-cms-widget-select) widget with boolean-like
options instead.

### `hint`

`hint` is not boolean-specific — it's a base field option available on every widget —
but is called out here because it's the most practical way to add the "why does this
toggle matter" context that a bare on/off control otherwise lacks. It renders as helper
text below the field label, above the toggle.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

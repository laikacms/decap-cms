# Object widget

The object widget groups a set of nested fields under a single, collapsible control. It's the
building block for structured, multi-field values (an "address" made of `street`/`city`/`zip`, an
SEO panel, etc.) and is also reused internally as the item shell for single-field list entries.

## Config

```yaml
- label: 'Address'
  name: 'address'
  widget: 'object'
  collapsed: true
  summary: '{{fields.city}}, {{fields.zip}}'
  fields:
    - { label: 'Street', name: 'street', widget: 'string' }
    - { label: 'City', name: 'city', widget: 'string' }
    - { label: 'Zip', name: 'zip', widget: 'string', i18n: 'duplicate' }
```

- `fields` (required unless `field` is set) — the array of nested field definitions rendered inside
  the object. Read in `ObjectControl.tsx` as `field.fields`.
- `field` — a single nested field definition, used instead of `fields` when the object has exactly
  one child. This shape only shows up when `ObjectControl` is reused as the item shell of a
  single-field `ListControl`; author-facing collection configs should use `fields`. Read as
  `field.field`; `ObjectControl.tsx` resolves the child fields to render as
  `field.field ? [field.field] : (field.fields ?? [])`.
- `collapsed` (optional, default `false`) — whether the object starts collapsed. Declared as a
  `boolean` in `schema.ts` and read in `ObjectControl.tsx` as `field.collapsed ?? false` to seed the
  control's initial `collapsed` state. This only affects the object's own top bar toggle; when the
  object is rendered as a list item shell (`forList`), the collapsed state instead comes from the
  parent `ListControl` (`props.collapsed`), not from this key.
- `summary` (optional) — a template string rendered in the object's top bar heading while it's
  collapsed, in place of the field's label. Read in `ObjectControl.tsx`'s `objectLabel()` and
  resolved with `stringTemplate.compileStringTemplate`, so it supports the same `{{fields.<name>}}`
  placeholders as other summary templates (for example the list widget's `summary`), interpolated
  against the object's current value.
- `i18n` (optional, default `false`) — declared as a `boolean` in `schema.ts` for the object widget
  itself. Note this widget-level flag is distinct from the generic per-nested-field `i18n` key (see
  below), which is what most collection authors will reach for; setting `i18n` on the object field's
  nested `fields` entries (`'translate'`, `'duplicate'`, or `'none'`) is what actually drives
  per-locale translate/duplicate/hide behavior for those nested values (`core/lib/i18n.tsx`).

Like every widget, nested `fields` entries also accept the standard field-level `i18n` key
(`'translate' | 'duplicate' | 'none'`, or `true`/`false`) to control how that specific nested value
behaves in an i18n-enabled collection — for example `zip` above is duplicated into every locale
rather than translated per-locale.

## Single-field vs. multi-field shell

Source: `ObjectControl.tsx`.

`ObjectControl` backs two different UI shapes depending on which of `field.field` / `field.fields`
is present:

- Standalone object widget (author-configured `widget: 'object'` with `fields`) — renders its own
  `Collapsible` with a top bar (label/summary + collapse toggle) and the nested fields inside.
- List item shell (`forList: true`) — when a list widget has a single scalar `field` instead of
  `fields`, the list reuses `ObjectControl` to render that one field per item, but hides its own top
  bar and collapse chrome; collapse state and the toggle itself live in the parent `ListControl`
  instead (`renderedCollapsed = forList ? props.collapsed : collapsed`).

If neither `field` nor `fields` is present, the control renders
`<h3>No field(s) defined for this
widget</h3>` instead of throwing.

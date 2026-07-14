# decap-cms-widget-object

The Object widget allows you to group multiple fields together as a single, nested field in the
front matter. It supports being rendered collapsed with a customizable summary heading, and
per-field i18n behavior for its nested fields.

## Options

| Name        | Type              | Default | Description                                                                                     |
| ----------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `collapsed` | boolean           | `false` | Render the object collapsed by default                                                          |
| `summary`   | string            |         | Template for the heading shown when the object is collapsed. Falls back to `label`, then `name`. |
| `i18n`      | boolean or string |         | i18n behavior for this field: `true`, `translate`, `duplicate`, or `none`                        |
| `field`     | field config      |         | A single field definition nested inside the object. Mutually exclusive with `fields`.            |
| `fields`    | list of fields    |         | Multiple field definitions nested inside the object. Mutually exclusive with `field`.            |

```yaml
- label: 'Hero'
  name: 'hero'
  widget: 'object'
  collapsed: true
  summary: '{{fields.title}}'
  fields:
    - { label: 'Title', name: 'title', widget: 'string' }
    - { label: 'Image', name: 'image', widget: 'image' }
```

### `collapsed`

When `true`, the object renders collapsed on initial load, showing only its summary heading; the
user must expand it to see the nested fields. It only affects the initial render — the user can
always toggle collapse/expand afterward, and the toggled state is not persisted.

### `summary`

`summary` is a template string rendered as the heading shown while the object is collapsed. If
`summary` is not set, the heading falls back to the field's `label`, and if that isn't set either,
to the field's `name`.

The template is compiled with the same engine used for `slug` templates
(`compileStringTemplate` in `decap-cms-lib-widgets`), so it supports:

- Field-path interpolation against the object's own value, e.g. `{{title}}` or `{{fields.title}}`
  (the `fields.` prefix takes precedence over any built-in replacement of the same name, such as
  `slug` or a date token).
- The same filters as slug templates, e.g. `{{title | upper}}`, `{{title | truncate(20)}}`,
  `{{title | default('Untitled')}}`, `{{title | ternary('Yes','No')}}`.

**Caveat: date tokens are always dropped.** Because a `summary` is compiled with no date context
(`compileStringTemplate(summary, null, '', data)`), any date-based token —
`{{year}}`, `{{month}}`, `{{day}}`, `{{hour}}`, `{{minute}}`, `{{second}}` — always resolves to an
empty string instead of erroring or rendering the raw token. `{{slug}}` is also always empty for
the same reason (no identifier is passed in). There is no warning in the UI: a `summary` template
copied from a `slug` config (which does have a date/identifier) will silently lose those tokens.
Reference a real field on the object (e.g. a `datetime` field) by name instead of a date token if
you need a date in the summary.

### `i18n`

`i18n` controls how this field behaves for non-default locales in an i18n-enabled collection:

- `true` or `'translate'` — the field is editable per-locale, and its value is stored and read
  from that locale's own data path, independently of other locales.
- `'duplicate'` — the field is rendered but disabled (read-only) in non-default locales; it
  always shows and stays in sync with the default locale's value rather than being translated.
- `'none'` — the field is hidden entirely in non-default locales; only the default locale's value
  exists and is used.
- unset (default) — the field is rendered and left editable in every locale, but it is not
  translatable: its value always reads from the default locale's data path, so edits made while
  viewing a non-default locale write through to the same shared value used by the default locale.

This applies to the object field as a whole; nested `field`/`fields` may set their own `i18n`
independently to control translation of individual sub-fields.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

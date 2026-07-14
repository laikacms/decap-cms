# decap-cms-widget-select

The Select widget allows you to author a value selected from a list of options, via a dropdown UI.

## Options

| Name       | Type    | Default | Description                                                                                 |
| ---------- | ------- | ------- | -------------------------------------------------------------------------------------------- |
| `options`  | array   |         | **Required.** The list of options to choose from. See "Option formats" below.                |
| `multiple` | boolean | `false` | Allow selecting multiple values instead of a single value.                                   |
| `min`      | integer |         | Minimum number of selected options. Only enforced when `multiple: true` — see below.         |
| `max`      | integer |         | Maximum number of selected options. Only enforced when `multiple: true` — see below.         |

### Option formats

Each entry in `options` may be either:

- a plain string or number, used as both the label and the value, or
- an object with `label` and `value` keys:

```yaml
- label: 'Draft'
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

### `min` and `max` require `multiple: true`

`min` and `max` are only enforced when `multiple: true`. If `multiple` is not `true`, `min` and `max` are silently ignored at runtime — the field still behaves as a single-select with no bounds, and no validation error or warning is raised.

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

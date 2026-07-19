# decap-cms-widget-relation

The Relation widget allows you to reference an entry from another collection (or another file
in a file collection), searching and selecting it by one or more of its fields.

## Options

| Name             | Type                | Default | Description                                                                                                                        |
| ---------------- | ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `collection`     | string              |         | **Required.** Name of the collection being referenced.                                                                              |
| `file`           | string              |         | For file collections, the name of the specific file being referenced.                                                               |
| `value_field`    | string              |         | **Required.** Field (or templated path) of the referenced entry whose value is stored as this field's value.                        |
| `search_fields`  | list of strings     |         | **Required.** Fields of the referenced entry to search against.                                                                     |
| `display_fields`| list of strings     |         | Fields of the referenced entry to display in the search results and selected value. Defaults to `value_field`.                      |
| `filters`        | list of filters     |         | Restricts which entries of the referenced collection are selectable. See "`filters`" below.                                         |
| `options_length` | integer             | `20`    | Maximum number of options fetched/shown at a time in the search dropdown.                                                           |
| `multiple`       | boolean             | `false` | Allow selecting multiple entries instead of a single one.                                                                           |
| `min`            | integer             |         | Minimum number of selected entries. Only enforced when `multiple: true` — see below.                                                |
| `max`            | integer             |         | Maximum number of selected entries. Only enforced when `multiple: true` — see below.                                                |

### camelCase aliases

`value_field`, `search_fields`, `display_fields`, and `options_length` may also be written in
camelCase (`valueField`, `searchFields`, `displayFields`, `optionsLength`). The camelCase form is
only used as a fallback when its snake_case counterpart is not set — if both are present,
snake_case wins.

```yaml
- label: 'Author'
  name: 'author'
  widget: 'relation'
  collection: 'authors'
  valueField: 'slug' # equivalent to value_field
  searchFields: ['name'] # equivalent to search_fields
```

### `filters`

`filters` is a list of objects, each with a `field` (a dot-separated path into the referenced
entry's data, e.g. `nested.field`) and `values` (an array of allowed values for that field). Only
entries in the referenced collection that match **every** filter (i.e. whose value at `field` is
included in that filter's `values`) are selectable — entries that don't match any single filter
are excluded from search results:

```yaml
- label: 'Author'
  name: 'author'
  widget: 'relation'
  collection: 'authors'
  value_field: 'slug'
  search_fields: ['name']
  filters:
    - field: 'status'
      values: ['active']
    - field: 'role'
      values: ['editor', 'admin']
```

An entry whose `field` path doesn't exist on its data is treated as not matching that filter (and
is therefore excluded).

### `options_length`

The search dropdown fetches and displays at most `options_length` options at a time (default
`20`). Narrow the search term to find entries beyond that cap.

### `min` and `max` require `multiple: true`

`min` and `max` are only enforced when `multiple: true`. If `multiple` is not `true`, `min` and
`max` are silently ignored at runtime — the field still behaves as a single-select with no
bounds, and no validation error or warning is raised.

```yaml
- label: 'Authors'
  name: 'authors'
  widget: 'relation'
  collection: 'authors'
  value_field: 'slug'
  search_fields: ['name']
  multiple: true
  min: 1
  max: 3
```

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

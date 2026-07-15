# decap-cms-widget-string

The String widget is a basic single-line text input. It's also Decap CMS's default
widget — a field with no `widget` key falls back to `string`.

## Configuration options

| Option      | Type   | Default | Description |
|-------------|--------|---------|-------------|
| `label`     | string | Field `name` | Label for the field in the editor UI. |
| `name`      | string | —       | Unique field identifier. |
| `default`   | string | —       | Initial value for a new entry. |
| `pattern`   | array  | —       | `[regex, error message]` pair used to validate the value on save. |
| `required`  | boolean | `true` | Whether the field must have a non-empty value to save. |
| `hint`      | string | —       | Instructional text rendered under the field label in the editor UI. |

```yaml
- label: 'Title'
  name: 'title'
  widget: 'string'
  default: 'New Post'
  pattern: ['.{20,}', 'Must be at least 20 characters long']
  hint: 'Shown as the page title and in link previews.'
```

### `default`

When a field has no `default`, the control initializes to an empty string
(`StringControl.defaultProps.value`). Set `default` to pre-fill new entries.

### `pattern`

`pattern` takes a two-element array: a regular expression (as a string) and the error
message to show when the value fails to match it. Validation runs on save, not on every
keystroke.

### `required`

Standard base-field option — an empty string fails the `required` check (unlike, e.g.,
the `boolean` widget, where `false` counts as a present value).

## Behavior notes

### Cursor position is preserved on nested fields

`StringControl` tracks `selectionStart` on every keystroke and, if the DOM's actual
cursor position has drifted from that after a re-render, restores it in
`componentDidUpdate`. This is not needed for top-level fields (e.g. a collection's
`title`), but it prevents the cursor from jumping to the end of the input for string
fields nested inside another widget — for example, the alt text field on a block image
inside a `markdown` widget. See
[decaporg#4539](https://github.com/decaporg/decap-cms/issues/4539) and
[decaporg#3578](https://github.com/decaporg/decap-cms/issues/3578).

### Bidi control character warning

If the field's raw value contains an invisible Unicode bidi-override character (e.g.
`U+202E RIGHT-TO-LEFT OVERRIDE`), the control renders a `⚠` warning badge next to the
input. Such characters can make a value render very differently from how it's stored —
a technique known as [Trojan Source](https://trojansource.codes/) — and are sometimes
used to disguise file names or titles (e.g. making `admin‮txt.exe` display as
`admin exe.txt`). The warning is purely informational: it doesn't block saving or alter
the stored value, so review the raw value carefully before saving when you see it.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

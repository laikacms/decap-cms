# decap-cms-widget-text

Text widget for [Decap CMS](https://decapcms.org). Renders a multi-line, auto-growing
`<textarea>` (via [`react-textarea-autosize`](https://github.com/Andarist/react-textarea-autosize))
for freeform plain-text content — think a short paragraph, summary, or description
field, not a single-line value like a title or slug.

## Configuration options

`text` has no widget-specific options of its own; it uses the base field options that
apply to (almost) every widget.

| Option     | Type    | Default      | Description |
|------------|---------|--------------|-------------|
| `label`    | string  | Field `name` | Label for the field in the editor UI. |
| `name`     | string  | —            | Unique field identifier. |
| `default`  | string  | `''` (empty string) | Initial value for a new entry. |
| `required` | boolean | `true`       | Whether the field must have a non-empty value to save the entry. |
| `hint`     | string  | —            | Instructional text rendered under the field label in the editor UI. |
| `pattern`  | array   | —            | `[regexString, errorMessage]` tuple. Validates the value against the regex; the entry can't be saved until it matches. |

```yaml
- label: 'Description'
  name: 'description'
  widget: 'text'
  required: false
  hint: 'A short summary shown in listings and social previews.'
  pattern: ['^.{0,280}$', 'Must be 280 characters or fewer']
```

## `text` vs. `string`

Both widgets store a plain string and share the same base field options — the
difference is purely in editing UX:

- [`string`](../decap-cms-widget-string) renders a single-line `<input type="text">`.
  Use it for short values like titles, slugs, or labels.
- `text` renders a multi-line `<textarea>` that grows with content (starting at 5
  rows). Use it for anything long-form enough to want line wrapping and more editing
  room — summaries, descriptions, excerpts — without pulling in the full
  [`markdown`](../decap-cms-widget-markdown) rich-text editor.

Neither widget preserves literal newlines specially beyond what a textarea naturally
allows; if you need structured or formatted content, use `markdown` instead.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

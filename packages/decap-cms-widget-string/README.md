# decap-cms-widget-string

String widget for [Decap CMS](https://decapcms.org). The default, catch-all text widget —
renders a single-line `<input type="text">` and is what `widget: string` (and the implicit
default when no `widget` is specified) resolves to.

## Configuration options

| Option     | Type            | Default       | Description |
|------------|-----------------|---------------|--------------|
| `label`    | string          | Field `name`  | Label for the field in the editor UI. |
| `name`     | string          | —             | Unique field identifier. |
| `default`  | string          | `''`          | Initial value for a new entry. |
| `required` | boolean         | `true`        | Whether the field must have a non-empty value to save the entry. |
| `hint`     | string          | —             | Instructional text rendered under the field label in the editor UI. |
| `pattern`  | `[regex, error]`| —             | A validation regex the value must match, paired with the error message shown when it doesn't. See [`pattern`](#pattern) below. |

```yaml
- label: 'Title'
  name: 'title'
  widget: 'string'
  default: 'New Post'
  hint: 'Appears as the page title and in link previews.'
  pattern: ['.{1,100}', 'Must be between 1 and 100 characters.']
```

### `pattern`

`pattern` is not string-specific — it's a base field option available on most widgets — but
it's most commonly reached for here, since free-form text is where format constraints (max
length, allowed characters, required prefixes, etc.) come up most often. It takes a
two-element array: a regex (as a string, without delimiters) the value must fully match, and
the error message shown in the editor UI when it doesn't.

```yaml
pattern: ['[a-z0-9-]+', 'Lowercase letters, numbers, and hyphens only.']
```

### `required` and empty-value semantics

An empty string fails the built-in `required` check, so a required string field blocks
saving until the editor enters some text. Set `required: false` to allow the field to be
left blank.

## Bidirectional (bidi) control character warning

`decap-cms-widget-string` detects Unicode bidirectional control characters (e.g.
`U+202E RIGHT-TO-LEFT OVERRIDE`, `U+2066`–`U+2069`, `U+061C`) in the field's value and shows
a warning icon (⚠) next to the input when any are present.

These invisible characters can reorder how surrounding text is *rendered* without changing
the underlying stored characters — the technique behind
["Trojan Source"](https://trojansource.codes/) (CVE-2021-42574) spoofing. A string entered
in one order can display in a completely different, misleading order elsewhere (e.g. in a
list of entries, a file name, or a rendered page), which can be used to disguise malicious
or unexpected content as something benign.

The widget only warns — it never silently strips or otherwise mutates the value an editor
typed. Hovering the warning icon shows a tooltip explaining the risk; reviewers should
inspect the raw value carefully before saving when it appears. The detection and
visualization logic lives in
[`decap-cms-lib-widgets`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-widgets)
(`bidiControls.containsBidiControls`), which other widgets can reuse for the same warning
behavior.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

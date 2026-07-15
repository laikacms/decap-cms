# decap-cms-widget-code

The Code widget provides a CodeMirror-based editor for entering syntax-highlighted code.

## Options

| Name                        | Type    | Default | Description                                                                                                                    |
| --------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `default_language`          | string  |         | The language to select when the stored value doesn't already carry its own language.                                            |
| `allow_language_selection`  | boolean | `false` | Show a language dropdown in the widget's settings pane, letting editors change the code's language.                              |
| `output_code_only`          | boolean | `false` | Persist only the raw code string instead of a `{ code, lang }` map. See "Persisted value shape" below.                          |
| `keys.code`                 | string  | `code`  | The property name used for the code string when the persisted value is a map. Ignored when the widget is used as an editor component. |
| `keys.lang`                 | string  | `lang`  | The property name used for the language when the persisted value is a map. Ignored when the widget is used as an editor component.    |

```yaml
- label: 'Code'
  name: 'code_block'
  widget: 'code'
  default_language: 'javascript'
  allow_language_selection: true
  output_code_only: false
  keys:
    code: 'body'
    lang: 'language'
```

### Persisted value shape

By default (`output_code_only: false`), the widget persists a map with the code and its language, keyed by `keys.code` / `keys.lang` (`code` / `lang` by default):

```yaml
code_block:
  code: 'console.log("hi")'
  lang: 'javascript'
```

When `output_code_only: true`, only the raw code string is persisted and the language is not stored:

```yaml
code_block: 'console.log("hi")'
```

### `default_language`

Seeds the initial language shown in the editor when the stored value doesn't already carry a language (e.g. on a new entry, or when `output_code_only: true` so no language is persisted).

### `allow_language_selection`

When `allow_language_selection` is `false` (the default), the language dropdown is hidden from the settings pane. When `true`, editors can pick a different language from the dropdown.

### `output_code_only`

When `output_code_only` is `false` (the default), the widget persists a `{ code, lang }` map so the language survives alongside the code. When `true`, only the code string is persisted — the language selection isn't stored, and on reload the language falls back to `default_language`.

### `keys.code` / `keys.lang`

When the persisted value is a map (`output_code_only` is `false`), `keys.code` and `keys.lang` remap the map's property names from the defaults `code` / `lang`. This option is ignored when the widget is used as an editor component (e.g. an inline code block in the Rich Text/Markdown editor) — editor-embedded code blocks always use the default `code` / `lang` keys.

### Widget-level `codeMirrorConfig`

Custom widget registrations can also pass a `codeMirrorConfig` object (not a field-level config, but a registration-time option) which is spread directly into the underlying CodeMirror `options`, including `extraKeys`. This lets a custom widget registration override any CodeMirror option.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

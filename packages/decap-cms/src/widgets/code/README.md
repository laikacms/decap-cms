# Code widget

The code widget provides a CodeMirror-based editor for entering syntax-highlighted code.

## Config

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

- `default_language` (optional) — the language to seed the editor with when the stored value
  doesn't already carry its own language (e.g. on a new entry, or whenever the language isn't
  persisted — see "`output_code_only`" below). Source: `schema.ts`, `CodeControl.tsx`
  (`initialLang`).
- `allow_language_selection` (optional, default `true`) — show the language dropdown in the
  widget's settings pane, letting editors change the code's language. Source: `schema.ts`,
  `CodeControl.tsx` (`field.allow_language_selection ?? true`).
- `output_code_only` (optional, default `false`) — persist only the raw code string instead of a
  `{ code, lang }` map. See "Persisted value shape" below. Source: `schema.ts`, `CodeControl.tsx`
  (`valueIsMap()`).
- `keys` (optional) — customize the property names used for the code string and language when the
  persisted value is a map. See "`keys`" below. Source: `schema.ts`, `CodeControl.tsx`
  (`getKeys()`).

## Persisted value shape

By default (`output_code_only: false`), the widget persists a map with the code and its language,
keyed by `keys.code` / `keys.lang` (`code` / `lang` by default):

```yaml
code_block:
  code: 'console.log("hi")'
  lang: 'javascript'
```

When `output_code_only: true`, only the raw code string is persisted and the language selection is
not stored:

```yaml
code_block: 'console.log("hi")'
```

Note that when the widget is used as an editor component (e.g. an inline code block inside the
Rich Text/Markdown editor), the persisted value is always the `{ code, lang }` map regardless of
`output_code_only` — the raw-string form only applies to top-level fields. Source:
`CodeControl.tsx` (`valueIsMap()`: `!field.output_code_only || !!isEditorComponent`).

## `default_language`

Seeds the initial language shown in the editor when the current value doesn't already carry a
language — for example on a brand-new entry, or any time `output_code_only: true` means no
language is persisted to read back. It has no effect once a language has been picked or loaded
from a stored value.

## `allow_language_selection`

Controls whether the "Mode" (language) dropdown appears in the widget's settings pane. It defaults
to `true`, so editors can change the language unless the field explicitly sets
`allow_language_selection: false`. The Theme and KeyMap dropdowns in the settings pane are global
editor preferences and are unaffected by this option.

## `output_code_only`

When `output_code_only` is `false` (the default), the widget persists a `{ code, lang }` map so
the language survives alongside the code. When `true`, only the code string is persisted — the
language selection isn't stored, and on reload the language falls back to `default_language`.

## `keys`

When the persisted value is a map (`output_code_only` is `false` and the field isn't an editor
component), `keys.code` and `keys.lang` remap the map's property names away from the defaults
`code` / `lang`:

```yaml
- label: 'Snippet'
  name: 'snippet'
  widget: 'code'
  keys:
    code: 'body'
    lang: 'language'
```

```yaml
snippet:
  body: 'console.log("hi")'
  language: 'javascript'
```

`keys` is ignored when the widget is used as an editor component (e.g. an inline code block in the
Rich Text/Markdown editor) — editor-embedded code blocks always use the default `code` / `lang`
keys, regardless of the field's `keys` config.

## Widget-level `codeMirrorConfig`

Custom widget registrations (not a per-field config, but an option passed at registration time)
can also supply a `codeMirrorConfig` object, which is spread into the underlying CodeMirror setup.
Currently `lineNumbers` is read from it (`false` hides line numbers; anything else keeps them
visible). Source: `CodeControl.tsx` (`codeMirrorConfig`, `lineNumbers`).

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

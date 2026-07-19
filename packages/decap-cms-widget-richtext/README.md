# decap-cms-widget-richtext

The Rich Text widget provides a WYSIWYG editor for editing Markdown, with an optional raw
Markdown editing mode.

## Options

| Name               | Type             | Default                | Description                                                                               |
| ------------------- | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `modes`             | array of string  | `['rich_text', 'raw']`  | Editing modes to allow. Valid values: `rich_text`, `raw`. See "Modes" below.                 |
| `buttons`           | array of string  |                          | Allowlist of toolbar buttons to show. See "Toolbar buttons" below.                           |
| `editor_components` | array of string  |                          | Allowlist of editor components (shortcodes) available from the toolbar. See below.           |
| `editorComponents`  | array of string  |                          | Deprecated camelCase alias for `editor_components`. See "Deprecated `editorComponents`".     |
| `minimal`           | boolean          | `false`                  | Renders a more compact editor (shorter minimum height). See "Minimal mode" below.            |
| `sanitize_preview`  | boolean          | `true`                   | Sanitize the rendered HTML in the preview pane. Set to `false` to allow raw HTML through.     |
| `media_library`     | object           |                          | Deep-merged into any nested `image` editor component's `image` sub-field. See below.         |
| `media_folder`      | string           |                          | Backfilled onto a nested `image` editor component's `image` sub-field. See below.            |
| `public_folder`     | string           |                          | Backfilled onto a nested `image` editor component's `image` sub-field. See below.            |

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
```

### Modes

`modes` controls which editing surfaces are available for the field, and accepts any subset of
`rich_text` (WYSIWYG) and `raw` (plain Markdown text). It defaults to both, in that order.

The mode toggle in the toolbar (the "Rich Text" / "Markdown" switch) is only rendered when more
than one mode is allowed. Set `modes` to a single value to lock the field into that mode and hide
the toggle entirely:

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
  modes: ['raw']
```

Note: when the widget is used as a nested field inside another editor component (i.e. it is
itself rendered inside a shortcode), it always starts in `rich_text` mode regardless of `modes`,
since the surrounding editor component already implies the editing surface.

### Toolbar buttons

`buttons` is an allowlist of which formatting buttons appear in the toolbar. When `buttons` is
not set, every available button is shown. When set, only the listed button ids are shown.

Available button ids: `bold`, `italic`, `strikethrough`, `code`, `link`, `heading-one`,
`heading-two`, `heading-three`, `heading-four`, `heading-five`, `heading-six`, `quote`,
`bulleted-list`, `numbered-list`.

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
  buttons: ['bold', 'italic', 'link']
```

The editor-components button (for inserting shortcodes) is controlled separately via
`editor_components`, not `buttons`.

### Editor components (shortcodes)

`editor_components` is an allowlist of which registered editor components (shortcodes) can be
inserted from the toolbar's editor-components menu. When unset, all registered editor components
are available. When set, only the listed component ids are offered:

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
  editor_components: ['image', 'code-block']
```

#### Deprecated `editorComponents`

The camelCase key `editorComponents` is a deprecated alias for `editor_components`. It is only
honored when `editor_components` is not set; if both are present, `editor_components` wins.
Prefer `editor_components` in new configs.

### Minimal mode

`minimal: true` renders a more compact editor: the minimum editor height shrinks from the
default rich-text-editor height down to the content's natural height, in both the `rich_text`
and `raw` editing surfaces. Useful for short fields (e.g. a one-line summary that still needs
inline formatting) where the full-height editor would waste space.

```yaml
- label: 'Summary'
  name: 'summary'
  widget: 'richtext'
  minimal: true
  modes: ['rich_text']
```

### Preview sanitization

`sanitize_preview` controls whether the HTML rendered in the preview pane is sanitized before
being injected into the page. It defaults to `true`. Set it to `false` only if you trust the
Markdown source and need raw HTML (e.g. embeds) to render as-is in the preview:

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
  sanitize_preview: false
```

### Media config inheritance for nested `image` components

If a registered `image` editor component (shortcode) has its own `image` sub-field, this widget
passes media-related config down to it from the richtext field itself, so you don't have to
repeat it on every nested image field:

- `media_library` is **deep-merged**: the richtext field's `media_library` config is merged with
  the nested `image` sub-field's own `media_library` config, with the nested field's values
  taking precedence on conflicting keys.
- `media_folder` and `public_folder` are only **backfilled**: each is applied to the nested
  `image` sub-field only if that sub-field does not already define its own value for that key.
  If the nested field already sets it, the nested field's value is left untouched.

```yaml
- label: 'Body'
  name: 'body'
  widget: 'richtext'
  media_folder: '/static/images'
  public_folder: '/images'
  media_library:
    config:
      multiple: false
```

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

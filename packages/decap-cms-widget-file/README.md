# decap-cms-widget-file

The File widget allows editors to upload a file or select one from the configured media library. It shares its schema and control implementation with the [Image widget](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-widget-image).

## Options

| Name                          | Type    | Default | Description                                                                                                                          |
| ----------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `choose_url`                  | boolean | `true`  | Show the "Insert from URL" button, letting editors paste a URL instead of choosing an asset                                          |
| `private`                     | boolean | `false` | Route this field's media library through the private media library flow instead of the public one                                    |
| `class`                       | string  |         | CSS class applied to the rendered preview container in the entry editor's preview pane                                                |
| `allow_multiple`              | boolean | `false` | Allow selecting more than one file for this field. Takes precedence over `media_library.allow_multiple` when set                      |
| `media_library`               | object  |         | Field-level overrides for the active media library implementation, applied only to this field                                        |
| `media_library.allow_multiple`| boolean | `false` | Allow selecting more than one file, used as a fallback when the top-level `allow_multiple` is not set                                 |
| `media_library.config`        | object  |         | Configuration object passed straight through to the media library implementation for this field, overriding the collection-level config |

### `class`

Set a CSS class on the preview container rendered in the entry editor's preview pane:

```yaml
- label: 'Attachment'
  name: 'attachment'
  widget: 'file'
  class: 'download-link'
```

### `media_library`

Use `media_library` to override the media library configuration for this field only, without changing the collection- or config-level media library settings:

```yaml
- label: 'Attachments'
  name: 'attachments'
  widget: 'file'
  media_library:
    allow_multiple: true
    config:
      multiple: true
```

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

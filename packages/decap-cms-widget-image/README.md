# decap-cms-widget-image

The Image widget allows editors to upload an image or select one from the configured media library.

## Options

| Name                          | Type    | Default | Description                                                                                                                          |
| ----------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `choose_url`                  | boolean | `true`  | Show the "Insert from URL" button, letting editors paste a URL instead of choosing an asset                                          |
| `private`                     | boolean | `false` | Route this field's media library through the private media library flow instead of the public one                                    |
| `class`                       | string  |         | CSS class applied to the rendered preview `<img>` in the entry editor's preview pane                                                  |
| `allow_multiple`              | boolean | `false` | Allow selecting more than one image for this field. Takes precedence over `media_library.allow_multiple` when set                     |
| `media_library`               | object  |         | Field-level overrides for the active media library implementation, applied only to this field                                        |
| `media_library.allow_multiple`| boolean | `false` | Allow selecting more than one image, used as a fallback when the top-level `allow_multiple` is not set                                |
| `media_library.config`        | object  |         | Configuration object passed straight through to the media library implementation for this field, overriding the collection-level config |
| `tagname`                     | string  |         | Wrap the rendered preview in this custom HTML tag name instead of the default preview container                                      |
| `crop_before_upload`          | boolean | `false` | Show a canvas-based crop step before an uploaded/dropped image is persisted, letting editors drag-select the area to keep or use the original |

### `class`

Set a CSS class on the preview image rendered in the entry editor's preview pane:

```yaml
- label: 'Hero Image'
  name: 'hero'
  widget: 'image'
  class: 'thumb'
```

### `media_library`

Use `media_library` to override the media library configuration for this field only, without changing the collection- or config-level media library settings:

```yaml
- label: 'Gallery'
  name: 'gallery'
  widget: 'image'
  media_library:
    allow_multiple: true
    config:
      multiple: true
```

### `tagname`

By default, the entry editor's preview pane wraps the rendered image preview in a
`WidgetPreviewContainer`. Set `tagname` to wrap it in a custom HTML tag name instead:

```yaml
- label: 'Hero Image'
  name: 'hero'
  widget: 'image'
  tagname: 'figure'
```

### `crop_before_upload`

When set, choosing a file to upload (or dropping one) opens a crop dialog before the image is
persisted to the media library backend. Editors can drag a rectangle over the image and confirm
to upload only that region, or click "Use original" to skip cropping for that upload:

```yaml
- label: 'Hero Image'
  name: 'hero'
  widget: 'image'
  crop_before_upload: true
```

Only applies to actual file uploads (drag-drop or the file picker); it has no effect when
inserting an existing asset from the media library or via "Insert from URL". Camera capture,
screen capture, QR-code scanning, AI image generation, and on-upload resizing are not covered by
this option — see [issue #1424](https://github.com/laikacms/decap-cms/issues/1424) for that
broader roadmap.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.

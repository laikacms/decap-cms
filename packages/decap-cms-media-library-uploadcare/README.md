# decap-cms-media-library-uploadcare

[Uploadcare](https://uploadcare.com/) integration for Decap CMS. It replaces the
built-in media library with Uploadcare's own upload widget, so editors upload and
select files through Uploadcare instead of Decap CMS's/your Git backend's storage.

Uploadcare has no "media library" browser (no way to list previously uploaded
files), so this package only opens the upload widget on demand from an editor
control; the global "Media" nav button is intentionally hidden (see
`enableStandalone` below).

## Enabling the integration

Set `media_library.name` to `uploadcare` in your `config.yml`:

```yaml
media_library:
  name: uploadcare
  config:
    publicKey: your-uploadcare-public-key
    multiple: false
  settings:
    defaultOperations: '/preview/-/resize/800x/'
    autoFilename: true
```

## `config`

| Key         | Type      | Default | Description                                                                                                                   |
| ----------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `publicKey` | `string`  | —       | **Required.** Your Uploadcare public key. Set once via `window.UPLOADCARE_PUBLIC_KEY` when the integration initializes.       |
| `multiple`  | `boolean` | `false` | Whether the widget allows selecting more than one file. Only takes effect when the field itself allows multiple values (see `allowMultiple` below). |
| any other key | — | — | Passed straight through, merged over the package defaults (`previewStep: true`, `integration: 'DecapCMS-Uploadcare-MediaLibrary'`), as raw [Uploadcare widget configuration](https://uploadcare.com/docs/uploads/file-uploader-options/). |

`publicKey` is pulled out of `config` and never forwarded to the widget itself;
every other key in `config` (global, under `media_library.config`, or per field,
under a field's `media_library.config`) is merged into the widget config used for
that `show()` call — per-field keys override global ones.

## `settings`

`settings` is only read at the point a file is inserted (it shapes the final CDN
URL), and is not passed to the Uploadcare widget itself.

| Key                       | Type      | Default | Description                                                                                                                                                     |
| ------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings.defaultOperations` | `string` | — | A [CDN operations](https://uploadcare.com/docs/transformations/) string appended to every inserted image's CDN URL, e.g. `/resize/800x/`. Must start with `/`; if it doesn't, a warning is logged to the console and the value is still used as-is. Ignored for non-image files. |
| `settings.autoFilename`      | `boolean` | `false` | When the resulting URL doesn't already end in a filename segment (i.e. `defaultOperations` doesn't include one and left the URL ending in `/`), append the original filename to the URL. |

## Per-field overrides

Image and file widgets can override the global `multiple`/`imagesOnly` behavior
per field via the field's own `media_library` block:

```yaml
- label: Gallery
  name: gallery
  widget: image
  media_library:
    config:
      imagesOnly: true
```

- `imagesOnly` — passed as a standalone property on `show()` (not under `config`)
  and merged into the resolved widget config as `imagesOnly`. Defaults to `false`.
- `allowMultiple` — set automatically by Decap CMS based on whether the field
  accepts multiple values. When `allowMultiple` is explicitly `false`, it forces
  `multiple: false` for that `show()` call regardless of `config.multiple`;
  otherwise the resolved `config.multiple` value is used as-is.

## `enableStandalone`

Always returns `false`. Uploadcare doesn't provide a library-browsing widget for
viewing/selecting previously uploaded files, so Decap CMS only opens the
Uploadcare widget when invoked from an editor control (e.g. an image widget's
"Choose an image" button) — the global "Media" nav button that opens a
standalone library view is hidden. This differs from library-style integrations
(e.g. `decap-cms-media-library-cloudinary`), which do support standalone
browsing.

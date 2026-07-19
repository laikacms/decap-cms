# decap-cms-media-library-cloudinary

[Cloudinary](https://cloudinary.com/) Media Library integration for Decap CMS. It lets
editors browse, upload, and insert assets through Cloudinary's own Media Library widget
instead of Decap CMS's built-in media library.

## Enabling the integration

Set `media_library.name` to `cloudinary` in your `config.yml`:

```yaml
media_library:
  name: cloudinary
  config:
    cloud_name: your-cloud-name
    api_key: your-api-key
  options:
    use_secure_url: true
    use_transformations: true
    output_filename_only: false
```

The `decap-cms-media-library-cloudinary` package itself does not talk to Cloudinary's API
directly — at runtime it loads Cloudinary's `media-library.cloudinary.com/global/all.js`
script and creates a `cloudinary.createMediaLibrary(...)` widget instance, so `config`
should contain whatever [Cloudinary Media Library widget configuration](https://cloudinary.com/documentation/media_library_widget)
you need (at minimum `cloud_name` and `api_key`).

## Init-time options (`media_library.options`)

These are read once when the widget is created and apply to every field using the
Cloudinary media library unless overridden per field (see below).

| Option                 | Default | Description                                                                                                                                                             |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `use_secure_url`       | `true`  | Use the asset's `secure_url` (`https`) instead of `url` (`http`) when building the inserted value.                                                                      |
| `use_transformations`  | `true`  | If the selected asset has a `derived` transformation applied in the Cloudinary widget, use that derived asset's URL instead of the original asset's URL.                |
| `output_filename_only` | `false` | Insert only `<public_id>.<format>` (e.g. `photo.jpg`) instead of a full URL, letting your static site generator resolve the final asset URL (including transformations). |

## Init-time config (`media_library.config`)

`config` is passed through to Cloudinary's own widget, with two exceptions:

- **Enforced keys** — `button_class`, `inline_container`, `insert_transformation`, and
  `z_index` are always set by the integration itself and cannot be overridden, whether
  supplied globally in `media_library.config` or per field. Any values you supply for
  these keys are silently discarded.
- **Behavior keys** — `default_transformations`, `max_files`, and `multiple` are
  Cloudinary widget options that affect how each `show()` call behaves (e.g. how many
  assets can be selected, which transformation presets are offered). These are the only
  `config` keys forwarded to the widget on every insert/selection call; everything else
  in `config` (e.g. `cloud_name`, `api_key`) is only used once, to create the widget.

All other keys in `config` are passed straight through to
`cloudinary.createMediaLibrary()` unmodified.

## Field-level options

Image and file widgets can override the integration's `options` (not `config`) per
field via `media_library.options`:

```yaml
- label: Cover Image
  name: cover
  widget: image
  media_library:
    config:
      multiple: false
    options:
      output_filename_only: true
```

Only `output_filename_only`, `use_transformations`, and `use_secure_url` are
field-overridable. Any other key placed under a field's `media_library.options` is
ignored. A field-level value always takes precedence over the global one from
`media_library.options` in `config.yml`; if a field doesn't set one of these three
options, the global default (or the package default) is used instead.

The `multiple` behavior key (and the other Cloudinary behavior keys above) can also be
set per field under `media_library.config`, and per-field `allowMultiple: false` (set
automatically by Decap CMS when a field doesn't allow multiple values) always forces
`multiple: false` for that field's widget invocation, regardless of `config.multiple`.

## Summary

| Key                                          | Level                | Overridable per field?                        |
| --------------------------------------------- | --------------------- | ---------------------------------------------- |
| `options.use_secure_url`                     | integration option    | yes                                             |
| `options.use_transformations`                | integration option    | yes                                             |
| `options.output_filename_only`               | integration option    | yes                                             |
| `config.default_transformations`             | Cloudinary widget     | yes (forwarded to every `show()` call)          |
| `config.max_files`                           | Cloudinary widget     | yes (forwarded to every `show()` call)          |
| `config.multiple`                            | Cloudinary widget     | yes (forwarded; also forced `false` by `allowMultiple: false`) |
| `config.button_class`                        | Cloudinary widget     | no — enforced, always overwritten               |
| `config.inline_container`                    | Cloudinary widget     | no — enforced, always overwritten               |
| `config.insert_transformation`               | Cloudinary widget     | no — enforced, always overwritten               |
| `config.z_index`                              | Cloudinary widget     | no — enforced, always overwritten               |
| any other `config.*` key (e.g. `cloud_name`)  | Cloudinary widget     | used once at widget creation only               |

# Cloudinary media library

An external `registerMediaLibrary` integration that wraps
[Cloudinary's Media Library widget](https://cloudinary.com/documentation/media_library_widget)
(`window.cloudinary.createMediaLibrary`, loaded from
`https://media-library.cloudinary.com/global/all.js`) so it can be used as Decap CMS's asset picker
instead of the built-in media library.

## Usage

```ts
import { registerMediaLibrary } from 'decap-cms/core';
import cloudinaryMediaLibrary from 'decap-cms/media/library-cloudinary';

registerMediaLibrary(cloudinaryMediaLibrary);
```

```yaml
# config.yml
media_library:
  name: cloudinary
  config:
    cloud_name: my-cloud-name
    api_key: '1234567890'
    multiple: false
    max_files: 5
    default_transformations: [[{ width: 200, height: 200, crop: 'fill' }]]
```

## `media_library.config` (Cloudinary widget config)

`options.config` (the CMS config's `media_library.config`) is passed to
`window.cloudinary.createMediaLibrary` as the widget's own config object, with three exceptions:

- Cloudinary requires `cloud_name` and `api_key` (or an equivalent signed/unsigned upload preset) to
  authenticate the widget — see Cloudinary's own docs for the full set of widget config keys. This
  integration does not add, validate, or default any of them; anything placed under
  `media_library.config` other than the keys below is passed straight through unmodified
  (`index.ts:76`, `cloudinaryConfig`).
- A fixed `defaultConfig` of `{ multiple: false }` (`index.ts:43-45`) is applied first, so
  `multiple` defaults to `false` unless the config overrides it.
- Four keys are **enforced** and cannot be overridden from `media_library.config` (`index.ts:36-41`,
  `enforcedConfig`, spread last so it always wins):
  - `button_class` — forced to `undefined`.
  - `inline_container` — forced to `undefined`.
  - `insert_transformation` — forced to `false`.
  - `z_index` — forced to `'99999'`.

Of the resulting merged config, only `default_transformations`, `max_files`, and `multiple` are
re-sent to the widget's `show()` call as "behavior config" (`index.ts:77-78`,
`cloudinaryBehaviorConfigKeys`) — see below.

## `options` (integration behavior)

These are sibling keys to `config` under `media_library.config` at the top level of `options` passed
to `init()` (i.e. set directly under `media_library`, not under `media_library.config`) —
`index.ts:24-34`, `CloudinaryOptions`/`defaultOptions`:

| Key                    | Type    | Default | Description                                                                                                                                |
| ---------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `use_secure_url`       | boolean | `true`  | When `true`, inserted asset URLs use `secure_url` (`https://`); when `false`, uses `url` (`http://`).                                      |
| `use_transformations`  | boolean | `true`  | When `true` and the selected asset has `derived` variants, inserts the first derived (transformed) URL instead of the original.            |
| `output_filename_only` | boolean | `false` | When `true`, inserts just `<public_id>.<format>` instead of a full URL — useful when a separate CDN/delivery URL is constructed elsewhere. |

```yaml
# config.yml
media_library:
  name: cloudinary
  use_secure_url: true
  use_transformations: false
  config:
    cloud_name: my-cloud-name
    api_key: '1234567890'
```

## `show()` behavior

- On `show()`, `config.multiple` is set to `false` whenever the caller passes
  `allowMultiple:
  false` (`index.ts:97-99`) — this is how the file/image widgets' per-field
  `allow_multiple: false` is enforced even if `media_library.config.multiple: true` is set globally.
  An `allowMultiple` of `undefined` never overrides an explicit `multiple: true` in config
  (DCMS-591).
- Only the "behavior config" keys (`default_transformations`, `max_files`, `multiple`) from the
  global config are merged into the per-call `show()` options; any per-call `config` passed to
  `show()` is spread on top and wins.
- `insertHandler` maps each selected Cloudinary asset to a URL via `getAssetUrl()`
  (`index.ts:47-59`) and calls `handleInsert` with a single URL, or an array when `config.multiple`
  is `true` or more than one asset was returned.
- `enableStandalone()` returns `true` — the widget can be shown standalone as a full media library,
  not only as a picker for widget fields.

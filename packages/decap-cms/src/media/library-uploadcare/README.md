# Uploadcare media library

An external `registerMediaLibrary` integration that wraps the
[`uploadcare-widget`](https://uploadcare.com/docs/uploads/file-uploader/) dialog (plus the
`uploadcare-widget-tab-effects` preview tab, registered under the `'preview'` tab name) so it can be
used as Decap CMS's asset picker instead of the built-in media library.

## Usage

```ts
import { registerMediaLibrary } from '@laikacms/decap-cms/core';
import uploadcareMediaLibrary from '@laikacms/decap-cms/media/library-uploadcare';

registerMediaLibrary(uploadcareMediaLibrary);
```

```yaml
# config.yml
media_library:
  name: uploadcare
  config:
    publicKey: 'your-uploadcare-public-key'
  settings:
    autoFilename: true
    defaultOperations: '/preview/-/resize/800x/'
```

## `media_library.config`

- `publicKey` (required) — your Uploadcare project's public key. Set as
  `window.UPLOADCARE_PUBLIC_KEY` on `init()` (`index.ts:112,115`); the widget will not authenticate
  without it.
- All other keys under `config` are passed through unmodified as the
  [Uploadcare widget's own config object](https://uploadcare.com/docs/uploads/file-uploader/#configuration)
  (`index.ts:112-113`, `globalConfig`), merged over a fixed `defaultConfig` of
  `{ previewStep: true, integration: 'DecapCMS-Uploadcare-MediaLibrary' }` (`index.ts:10-13`) — both
  of which can be overridden by the config. Notably, `config.multiple` controls whether the widget
  allows selecting more than one file (subject to the `allowMultiple` override below).

This integration also always sets `window.UPLOADCARE_LIVE = false` and
`window.UPLOADCARE_MANUAL_START = true` (`index.ts:4-5`) — not configurable.

## `media_library.settings`

A second, sibling top-level key (not nested under `config`) for behavior this integration adds on
top of the raw Uploadcare widget — `index.ts:44-47`, `Settings`:

| Key                 | Type    | Default | Description                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultOperations` | string  | none    | A [CDN operations](https://uploadcare.com/docs/transformations/image/) string appended to the CDN URL of inserted **images** only (`isImage` must be `true`), e.g. `'/preview/-/resize/800x/'`. Must start with `/` — if it doesn't, a `console.warn` is logged at `index.ts:66-69` (the value is still used as-is; the widget does not throw or strip it). |
| `autoFilename`      | boolean | `false` | When `true` and the resulting URL has no filename segment (i.e. it ends in `/`), appends the original file's name to the URL. Applied after `defaultOperations`, so the filename lands after the operations path.                                                                                                                                           |

```yaml
# config.yml
media_library:
  name: uploadcare
  config:
    publicKey: 'your-uploadcare-public-key'
  settings:
    defaultOperations: '/preview/-/resize/800x/'
    autoFilename: true
```

## Per-field overrides (`show()`)

Passed by the widget/file field integration when opening the picker, not set in `config.yml`
directly:

- `allowMultiple` — when explicitly `false`, forces `multiple: false` for that `show()` call
  regardless of `config.multiple` (`index.ts:132`). An `allowMultiple` of `undefined` never
  overrides an explicit `config.multiple: true` (DCMS-591).
- `imagesOnly` — defaults to `false`; forwarded to the widget as `imagesOnly` to restrict the picker
  to image files for that field.
- `value` — the field's current value (a CDN URL, an array of them, or an Uploadcare file-group URL
  pattern); used to preload already-selected files into the dialog via `getFiles()`
  (`index.ts:31-42`).

## `enableStandalone()`

Returns `false` — unlike the Cloudinary integration, this one cannot be shown as a standalone
library browser; it only opens as a picker dialog for widget fields.

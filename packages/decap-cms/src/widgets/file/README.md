# File widget

The file widget renders a "Choose a file" button that opens the media library, plus an optional
"Choose URL" button for pasting a remote/relative URL directly. It stores either a single string
path/URL, or (with `media_library.allow_multiple`) an array of them.

(`image` is a related widget — `packages/decap-cms/src/widgets/image/` — that shares this same
control implementation via `withFileControl({ forImage: true })` and renders image thumbnails
instead of file links.)

## Config

```yaml
- { label: 'Attachment', name: 'attachment', widget: 'file' }
```

- `choose_url` (optional, default `true`) — whether the "Choose URL" button is rendered, letting the
  editor paste a URL instead of picking a file from the media library. Set to `false` to hide it.
  Source: `withFileControl.tsx` — `const chooseUrl = field.choose_url !== false;` — the check is
  against `false`, not truthiness of `true`, so omitting the key or setting anything other than
  literal `false` keeps the button enabled.
- `media_library.allow_multiple` (optional) — allows selecting more than one file for this field;
  the value becomes an array of paths instead of a single string. Multi-file behavior is driven
  entirely by the nested `field.media_library` object (see "media_library overrides" below), not a
  top-level field property. A bare top-level `allow_multiple` is no longer declared in this
  widget's schema and is rejected as a config error by `checkFileFieldTopLevelAllowMultiple` in
  `packages/decap-cms/src/core/lib/validateConfig.ts` — set `media_library.allow_multiple` instead
  (DCMS-2325, DCMS-2330).
- `private` (optional, boolean) — passed straight through to the configured media library as
  `privateUpload` when opening it (see `handleChange`/`onReplaceOne` in `withFileControl.tsx`), for
  backends that support separate public/private asset storage (e.g. an S3-backed media library with
  a private bucket). Whether it does anything depends on the media library implementation in use;
  see that implementation's own docs. Declared in the JSON-schema `properties` below so it validates
  the same as the widget's other keys.

## `media_library` overrides

Source: `withFileControl.tsx`.

Per-widget media-library options are read from a single place: `field.media_library`
(`getMediaLibraryFieldOptions()` returns `field.media_library` directly). Its shape is
`CmsMediaLibrary` (`src/lib/util/types/cms/media.ts`): `{ name, config？, allow_multiple？ }`. Two
sub-keys are consumed here:

- `field.media_library.allow_multiple` — read as `opts?.allow_multiple` and forwarded to
  `onOpenMediaLibrary` as `allowMultiple`. This is the only place the option is declared: the
  schema has no top-level `allow_multiple`, and `validateConfig.ts`
  (`checkFileFieldTopLevelAllowMultiple`) throws a config error if one is set.
- `field.media_library.config.multiple` must agree with `allow_multiple`: `checkFileFieldMultipleSwitchesAgree`
  throws a config error when exactly one of the two is truthy (see `widgets/image/README.md`).
- `field.media_library.config` — forwarded to `onOpenMediaLibrary` as `config`, for
  media-library-specific settings (e.g. `max_file_size`).

A second, older override path, `field.options.media_library`, along with its unused
`warnDeprecatedOptions` deprecation-warning helper left over from before the v4.beta rewrite, has
been removed (see DCMS-2071). Configure media-library overrides via `field.media_library` only.

For the shape and behavior of the media library itself (global collection/registered media
libraries, `config`, upload flow), see `src/core/mediaLibrary.ts` and
`src/core/components/MediaLibrary/`; there is no separate top-level media-library README to
cross-reference at this time.

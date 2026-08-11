# Image widget

The image widget renders a "Choose an image" button that opens the media library, plus an optional
"Insert from URL" button for pasting a remote/relative image URL directly. Selected images are shown
as thumbnails (a single thumbnail, or a sortable gallery when the field allows more than one) rather
than the file link/list the `file` widget renders.

Source: `index.ts`. The control is not implemented in this package — it's the `file` widget's
control, reused via `DecapCmsWidgetFile.withFileControl({ forImage: true })`
(`packages/decap-cms/src/widgets/file/withFileControl.tsx`). Passing `forImage: true` swaps the
file-link rendering for image thumbnails (`renderImages`/`ImageWrapper`/`SortableMultiImageWrapper`
in that file) and switches the button labels/media-library call to the `image` locale namespace
(`editor.editorWidgets.image.*`) instead of `file`. See
`packages/decap-cms/src/widgets/file/README.md` for the control's shared config surface (`private`,
`media_library` shape, URL-scheme allowlist, etc.) — this README covers the two properties in this
widget's own schema plus the image-specific rendering/interaction differences.

## Config

```yaml
- { label: 'Photo', name: 'photo', widget: 'image' }
```

- `default` (optional) — pre-filled value (a path/URL string) for new entries.
- `required` (optional, default `true`) — whether the field must be filled in before the entry can
  be saved.
- `hint` (optional) — helper text rendered alongside the field label.

This widget's own JSON-schema (`schema.ts`) declares three scalar properties, plus `media_library`
(covered in its own section below):

```ts
export default {
  properties: {
    allow_multiple: { type: 'boolean' },
    choose_url: { type: 'boolean' },
    private: { type: 'boolean' },
  },
};
```

- `choose_url` (optional, default `true`) — whether the "Insert from URL" / "Replace with URL"
  button is rendered, letting the editor paste an image URL instead of picking one from the media
  library. Set to `false` to hide it. Read in `withFileControl.tsx` as `field.choose_url !== false`
  — the check is against literal `false`, so omitting the key or setting anything other than `false`
  keeps the button enabled. The button is also hidden whenever the field already holds more than one
  image (`chooseUrl && !multi`, see below).
- `allow_multiple` — declared on this widget's schema (and on `CmsFieldImage`), but
  **`withFileControl.tsx` never reads this top-level field property**. Like the `file` widget,
  multi-image behavior is driven entirely by nested `field.media_library` keys instead (see
  "media_library overrides" below). A bare top-level `allow_multiple: true` on an `image` field has
  no effect on the control by itself.
- `private` (optional) — like `file/schema.ts`, this widget's schema also declares
  `private: { type: 'boolean' }`, matching `CmsFieldImage`'s typing
  (`src/lib/util/types/cms/fields/image.ts`) and the `field.private` forwarding in
  `withFileControl.tsx` (as `privateUpload`, regardless of widget). Validation behaviour for
  `private` on an `image` field is therefore the same as it is for `file`.

## `media_library` overrides — two separate "multiple" switches

Source: `withFileControl.tsx`. Per-field media-library options come from `field.media_library`
(`CmsMediaLibrary`: `{ name, config?: { multiple?, max_file_size? }, allow_multiple? }`). Two
different nested keys independently affect "multiple" behavior, and they are **not** the same
switch:

- `field.media_library.allow_multiple` — read only inside `handleChange`/`onReplaceOne` as
  `opts?.allow_multiple` and forwarded to `onOpenMediaLibrary` as `allowMultiple`. This only tells
  the media library dialog itself whether the user may select more than one asset in a single picker
  session.
- `field.media_library.config.multiple` — read by the local `allowsMultiple()` helper
  (`opts?.config && opts.config?.multiple`) and used purely for this widget's own UI: whether
  `renderSelection`/`renderNoSelection` show the gallery + sortable multi-image layout
  (`renderImages`/`SortableMultiImageWrapper`) versus a single thumbnail, whether the button label
  is "Choose images"/"Add more images" vs "Choose an image"/"Choose different image", whether the
  remove button says "Remove all images" vs "Remove image", and whether the "Insert from URL" button
  is shown at all (it's suppressed once `multi` is true).

Both keys need to be set for a field to behave as a coherent multi-image picker — setting only
`allow_multiple` lets the media library dialog select several assets but the widget still renders/
labels itself as single-image, and setting only `config.multiple` renders the multi-image gallery UI
without letting the media library dialog select more than one asset per open:

```yaml
- label: 'Gallery'
  name: 'gallery'
  widget: 'image'
  media_library:
    config:
      multiple: true
    allow_multiple: true
```

`field.media_library.config` (the whole object, not just `multiple`) is also forwarded to
`onOpenMediaLibrary` as `config`, for media-library-specific settings (e.g. `max_file_size`).

There is a second, older override path — `field.options.media_library` — referenced only in an
unused `warnDeprecatedOptions` helper left over from before the v4.beta rewrite; it's never invoked,
so `field.options.media_library` is dead code here too, same as in the `file` widget.

## Selection, replace, remove, and reorder

Source: `withFileControl.tsx`.

- Clicking "Choose an image" / "Choose images" opens the media library with `forImage: true`, so the
  library filters/presents image assets. On selection, the value (a path/URL string, or an array of
  them when `isMultiple(value)`) arrives back through the `mediaPaths` prop and is written via
  `onChange` in an effect that mirrors the control's old `componentDidUpdate`.
- With multiple images already selected, each thumbnail in the gallery has its own per-item
  "replace" (media icon) and "remove" (×) buttons (`SortableImageButtons`). Replace reopens the
  media library scoped to that one index (`onReplaceOne`, `allowMultiple: false`); remove splices
  that index out of the array and, if the array becomes empty, sets the value to `null` rather than
  `[]`.
- The gallery is drag-sortable (`SortableArea`/`SortableImage`); dropping an item calls `onSortEnd`,
  which reorders the array via `arrayMove` and writes it back with `onChange`.
- "Insert from URL" prompts for a URL (`promptDialog`) and validates it with `isSafeUrl` before
  calling `onChange` — only `http:`/`https:` (or protocol-relative `//…`) URLs are accepted, to
  avoid persisting `javascript:`/`data:`/`vbscript:` values that downstream, non-React renderers of
  the saved entry have no equivalent guard against (DCMS-577/DCMS-668). An invalid URL shows a
  translated alert and the value is left unchanged.
- "Remove image"/"Remove all images" clears the field's value (`onChange('')`) and releases the
  control's media-library slot (`onClearMediaControl`).

## Rendering an existing value: `ImagePreview.tsx` and `ImageAsset`

The read-only preview pane (`ImagePreview.tsx`) and the in-editor thumbnails
(`ImageAsset`/`SortableImage` in `withFileControl.tsx`) both resolve the field's stored value to a
displayable `src` in an effect rather than during render — resolving via `getAsset()` during render
dispatches redux actions synchronously, which triggers React's "Cannot update a component while
rendering a different component" warning (DCMS-1036 / decaporg/decap-cms#7416). `ImagePreview`'s
`StyledImageAsset` additionally special-cases an in-flight `File` object (before it has a saved
path): it creates an `URL.createObjectURL` object URL for it and revokes that object URL on cleanup,
so unsaved image selections still preview correctly without leaking blob URLs.

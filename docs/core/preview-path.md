# `preview_path`

`preview_path` is a collection- or file-level config key that builds a custom preview URL for an
entry, instead of relying on the URL returned by the backend. It works together with
`preview_path_date_field` and `preview_path_preserve_slashes`.

```yaml
collections:
  - name: posts
    preview_path: '{{year}}/{{month}}/{{slug}}'
    preview_path_date_field: date
```

`preview_path` is a template string. It supports the same `{{ }}` variable syntax as `slug`/`path`
(date parts, `{{slug}}`, `{{fields.<name>}}`, etc.). If no `preview_path` is configured, the preview
URL falls back to whatever the backend provides.

`preview_path_date_field` names the entry field used to resolve date variables (`{{year}}`,
`{{month}}`, ...) in the template. If omitted, the collection's inferred date field is used. These
date variables (`{{year}}`, `{{month}}`, `{{day}}`, `{{hour}}`, `{{minute}}`, `{{second}}`) resolve
in the browser's local time zone, not UTC — see
[`src/lib/widgets/README.md`](../../packages/decap-cms/src/lib/widgets/README.md).

Both keys can be set at the collection level, or overridden per file for `files`-type collections
via `files[].preview_path` / `files[].preview_path_date_field`.

## `preview_path_preserve_slashes`

- Type: `boolean`
- Default: `false`, unless the collection is nested
  ([`collection.nested`](../../packages/decap-cms/src/core/README.md#collectionnested) set), in
  which case it defaults to `true`
- Scope: collection-level (`collection.preview_path_preserve_slashes`), with an optional per-file
  override (`files[].preview_path_preserve_slashes`) for `files`-type collections

Each `{{ }}` segment substituted into `preview_path` is sanitized the same way a slug is
(lower-cased, accents/punctuation handled, unsafe characters replaced) before being spliced into the
template. By default that sanitization also strips out any `/` characters found _inside_ a
substituted value, so a field value like `section/subsection` becomes `section-subsection` in the
resulting preview path.

Setting `preview_path_preserve_slashes: true` disables that stripping for `/` characters, so
`section/subsection` is kept as-is and becomes an extra path segment in the preview URL.

`preview_path_preserve_slashes` only affects ordinary substituted values (for example
`{{fields.category}}` or `{{value}}`). The `{{dirname}}` (and `{{filename}}` / `{{extension}}`)
variables are always exempt from slug-sanitization — their slashes (where applicable) are preserved
unconditionally, regardless of what `preview_path_preserve_slashes` is set to. Nested collections
default `preview_path_preserve_slashes` to `true` so that _other_ fields referenced in
`preview_path` (not `dirname`, which is unaffected either way) behave consistently with a
multi-segment path.

```yaml
collections:
  - name: docs
    nested:
      depth: 5
    preview_path: 'docs/{{dirname}}/{{slug}}'
    # preview_path_preserve_slashes defaults to true here because the
    # collection is nested. Note this has no effect on {{dirname}} itself —
    # a dirname like "guides/setup" is always preserved as-is; setting
    # preview_path_preserve_slashes: false would not change that.
```

```yaml
collections:
  - name: posts
    preview_path: 'blog/{{fields.category}}'
    # Not nested, so this defaults to false. Set explicitly to preserve
    # slashes contributed by a field value such as "news/2026".
    preview_path_preserve_slashes: true
```

Resolution order (most specific wins): `files[].preview_path_preserve_slashes` →
`collection.preview_path_preserve_slashes` → `true` if `collection.nested` is set, otherwise
`false`.

## Invalid or missing date

If `preview_path` uses a date variable (`{{year}}`, `{{month}}`, `{{day}}`, `{{hour}}`, `{{minute}}`,
`{{second}}`) and the entry's date field (`preview_path_date_field`, or the inferred date field) is
missing or not a valid date, the `preview_path` is ignored rather than failing:

- The preview URL silently falls back to the base URL provided by the backend, with no path appended.
- An error is logged to the browser console: ``Collection "<name>" configuration error:
`preview_path_date_field` must be a field with a valid date. Ignoring `preview_path`.``
- The base URL is returned exactly as the backend provided it, including any trailing slash. This is
  the same form returned when no `preview_path` is configured at all.

## `site_url`, `show_preview_links` and `display_url`

`preview_path` only shapes the path of a preview link. Whether a preview link is produced at all,
and which base URL it is built on, is decided by the top-level `site_url` and `show_preview_links`
config keys.

```yaml
site_url: https://example.com
show_preview_links: true # default
# display_url: https://example.com # defaults to site_url
```

### `site_url`

- Type: `string` ([schema](../../packages/decap-cms/schema/config.schema.json#L373))
- Base URL of the published site. Used as the base for links to _published_ entries, with the
  collection's `preview_path` appended.
- Without `site_url` (or with `show_preview_links: false`) there is no preview link for published
  entries ([`getDeploy`](../../packages/decap-cms/src/core/backend.tsx#L1390)).

### `show_preview_links`

- Type: `boolean` ([schema](../../packages/decap-cms/schema/config.schema.json#L388))
- Default: `true` (only an explicit `false` disables it)
- Setting `show_preview_links: false` turns off preview links in both code paths:
  - [`getDeploy`](../../packages/decap-cms/src/core/backend.tsx#L1390) (published entries) returns
    nothing.
  - [`getDeployPreview`](../../packages/decap-cms/src/core/backend.tsx#L1419) (unpublished entries)
    returns nothing, so the backend is not asked for a deploy preview at all.

### `display_url`

- Type: `string` ([schema](../../packages/decap-cms/schema/config.schema.json#L374))
- Link target shown for the site in the UI. If `display_url` is not set but `site_url` is, it
  defaults to `site_url`
  ([`actions/config.tsx`](../../packages/decap-cms/src/core/actions/config.tsx#L382)). Setting
  `display_url` explicitly overrides that default.

### How they combine with `preview_path` and `getDeployPreview`

The preview link source depends on the entry's state
([`actions/deploys.tsx`](../../packages/decap-cms/src/core/actions/deploys.tsx#L88)):

| Entry state | Source of the base URL                                                                                         | `preview_path`                                                   | Disabled by `show_preview_links: false` |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| Published   | `site_url` (required)                                                                                          | Appended to `site_url`                                           | Yes                                     |
| Unpublished | URL returned by the backend's optional `getDeployPreview` (for example a Netlify deploy preview or dev server) | Appended to the backend URL, if configured; otherwise used as-is | Yes                                     |

- If the backend does not implement `getDeployPreview`, unpublished entries get no preview link;
  `site_url` is not used as a fallback for them
  ([`getDeployPreview`](../../packages/decap-cms/src/core/backend.tsx#L1419)).
- In both cases the final URL is built by `previewUrlFormatter` with the collection's
  `preview_path` (see above), so `preview_path` behaves the same for `site_url` and for
  backend-provided URLs.
- `files` collections get deploy previews like any other collection; `files[].preview_path` (and
  its `_date_field` / `_preserve_slashes` siblings) override the collection-level values for that file.

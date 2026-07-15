# `preview_path`

`preview_path` is a collection- or file-level config key that builds a custom preview
URL for an entry, instead of relying on the URL returned by the backend. It works
together with `preview_path_date_field` and `preview_path_preserve_slashes`.

```yaml
collections:
  - name: posts
    preview_path: '{{year}}/{{month}}/{{slug}}'
    preview_path_date_field: date
```

`preview_path` is a template string. It supports the same `{{ }}` variable syntax as
`slug`/`path` (date parts, `{{slug}}`, `{{fields.<name>}}`, etc.). If no
`preview_path` is configured, the preview URL falls back to whatever the backend
provides.

`preview_path_date_field` names the entry field used to resolve date variables
(`{{year}}`, `{{month}}`, ...) in the template. If omitted, the collection's inferred
date field is used.

Both keys can be set at the collection level, or overridden per file for
`files`-type collections via `files[].preview_path` / `files[].preview_path_date_field`.

## `preview_path_preserve_slashes`

- Type: `boolean`
- Default: `false`, unless the collection is nested (`collection.nested` set), in
  which case it defaults to `true`
- Scope: collection-level (`collection.preview_path_preserve_slashes`), with an
  optional per-file override (`files[].preview_path_preserve_slashes`) for
  `files`-type collections

Each `{{ }}` segment substituted into `preview_path` is sanitized the same way a
slug is (lower-cased, accents/punctuation handled, unsafe characters replaced) before
being spliced into the template. By default that sanitization also strips out any
`/` characters found *inside* a substituted value, so a field value like
`section/subsection` becomes `section-subsection` in the resulting preview path.

Setting `preview_path_preserve_slashes: true` disables that stripping for `/`
characters, so `section/subsection` is kept as-is and becomes an extra path segment
in the preview URL. This matters most for nested collections, where a field (for
example a computed `dirname`) legitimately contains a multi-segment path that should
be preserved rather than collapsed into one sanitized string — which is why nested
collections default this to `true`.

```yaml
collections:
  - name: docs
    nested:
      depth: 5
    preview_path: 'docs/{{dirname}}/{{slug}}'
    # preview_path_preserve_slashes defaults to true here because the
    # collection is nested — a dirname like "guides/setup" is preserved
    # instead of becoming "guides-setup".
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
`collection.preview_path_preserve_slashes` → `true` if `collection.nested` is set,
otherwise `false`.

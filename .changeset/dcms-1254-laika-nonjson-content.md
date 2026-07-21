---
"@laikacms/decap-cms": patch
---

laika backend: fail fast with an actionable client-side error when persisting a non-JSON-format
collection (markdown/frontmatter — Decap's default when no `format:` is set — YAML, or TOML), instead
of sending a raw string as `content` and getting an opaque 400 from the documents API. Set
`format: json` on the collection to use the laika backend today.

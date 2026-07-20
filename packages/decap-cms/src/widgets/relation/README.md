# Relation widget

The relation widget lets an entry reference another collection's entries by searching that
collection live and letting the editor pick a result.

## Config

```yaml
- { label: 'Author', name: 'author', widget: 'relation', collection: 'authors', search_fields: ['name'], value_field: 'name' }
```

- `collection` (required) — the collection to search.
- `value_field` / `valueField` (required) — the field of the matched entry stored on this entry.
- `search_fields` / `searchFields` (required, non-empty array) — the fields of the target collection
  matched against the search term.
- `display_fields` (optional) — fields shown in the option list; defaults to `value_field` when
  omitted.
- `file` (optional) — restrict the search to a single file (file collections).
- `filters` (optional) — `[{ field, values }]` pairs the results must match.
- `multiple`, `min`, `max` — standard multi-value controls.
- `options_length` (optional, **default `20`**) — maximum number of options shown per search. Set
  this higher if a collection has many entries that share similar search terms and the default cuts
  off relevant results.

Both `value_field` and `display_fields` are string templates and support `{{ field | filter }}` pipe
syntax (`upper`, `lower`, `date()`, `default()`, `ternary()`, `truncate()`) - see
[`src/lib/widgets/README.md#template-filters`](../../lib/widgets/README.md#template-filters).

## Search behavior

- Typing in the search box is **debounced by 500ms** (`RelationControl.tsx`) before a query is
  issued, to avoid firing a request per keystroke.
- Query results are capped client-side to `options_length` (default `20`) after being deduplicated
  against any already-selected options.

## Caching and staleness

Search results are cached by the shared query coordinator, `queryCore`
(`src/lib/util/queryCore.ts`). `RelationControl.tsx` calls
`queryCore.fetch(key, () => query(...), { tags: [collectionTag(collection)], keepValue: true })` for
both the initial-value lookup and debounced searches (`RelationControl.tsx:334-337,
437-441`). The
cache key is built by `relationOptionsKey(collection, searchFields, term, file)`
(`RelationControl.tsx:94`), so the exact same search (same collection, search fields, term and file)
returns the cached result set — via `keepValue: true` — instead of re-querying the backend.

`queryCore` entries are fresh for a 30s TTL by default and are also bounded to the 100 most
recently-inserted kept values (`QueryCore.ensureValueCap`, `src/lib/util/queryCore.ts`), evicting
the oldest entry once the cap is exceeded. Beyond the TTL, invalidation is tag-based: every relation
query is tagged with `collectionTag(collection)`, and `queryCore.invalidateTags([...])` clears every
cached key sharing a tag. This is called on entry save, delete, publish, and unpublish:
`src/core/actions/entries.tsx:937` (save) and `src/core/actions/editorialWorkflow.tsx:417` (save
draft), `:507` (delete unpublished), and `:543` (publish).

Because invalidation is keyed by collection name (`collectionTag`), it clears every cached search
for that collection, not just the specific entry that changed — searches are re-issued the next time
they're typed rather than proactively refetched.

`queryCore` also exposes a `clear()` method that resets all in-flight/cached state (used between
tests), and `invalidateKey()` for invalidating a single query key; relation search invalidation uses
only the tag-based `invalidateTags()` path described above.

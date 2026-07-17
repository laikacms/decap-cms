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

Both `value_field` and `display_fields` are string templates and support `{{ field | filter }}` pipe
syntax (`upper`, `lower`, `date()`, `default()`, `ternary()`, `truncate()`) — see
[`src/lib/widgets/README.md#template-filters`](../../lib/widgets/README.md#template-filters).

- `file` (optional) — restrict the search to a single file (file collections).
- `filters` (optional) — `[{ field, values }]` pairs the results must match.
- `multiple`, `min`, `max` — standard multi-value controls.
- `options_length` (optional, **default `20`**) — maximum number of options shown per search. Set
  this higher if a collection has many entries that share similar search terms and the default cuts
  off relevant results.

## Search behavior

- Typing in the search box is **debounced by 500ms** (`RelationControl.tsx`) before a query is
  issued, to avoid firing a request per keystroke.
- Query results are capped client-side to `options_length` (default `20`) after being deduplicated
  against any already-selected options.

## Caching and staleness

Search results are cached by `RelationCache` (`RelationCache.ts`) in a single module-level singleton
shared for the whole admin session. Cache entries are keyed by
`${collection}-${searchFields}-${term}-${file}`, so the exact same search (same collection, search
fields, term and file) returns the cached result set instead of re-querying the backend.

There is no time-based expiry. The cache is bounded to the 100 most recently-inserted entries (FIFO
eviction via `ensureCacheSize`), and is invalidated for a given collection — via
`relationCache.invalidateCollection(collection)` — whenever an entry in that collection is saved,
deleted, published, or unpublished (wired into the relevant success paths in
`src/core/actions/entries.tsx` and `src/core/actions/editorialWorkflow.tsx`).

Because invalidation is keyed by collection name, it clears every cached search for that collection,
not just the specific entry that changed — searches are re-issued the next time they're typed rather
than proactively refetched.

`RelationCache` also exposes a `clear()` method that empties the whole cache, but nothing in the
codebase calls it today — the only invalidation path is `invalidateCollection()` on entry
save/delete/publish/unpublish.

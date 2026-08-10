# `lib/domain`

The CMS domain types, published as `@laikacms/decap-cms/lib/domain`. Every
layer may import this module; it imports nothing itself, so a type-only import
pulls in no UI, store, or engine code.

The purity rule is enforced by the `local/layer-deps` ESLint rule, not by
convention: a single import here is a lint error.

## What lives here

| Type | Meaning |
| --- | --- |
| `Entry` | `CompleteEntry \| ProjectedEntry`, discriminated by `projected` |
| `EntryBase` | Entry identity and content: collection, slug, path, data, optional i18n/author/updatedOn/meta |
| `LocaleVariant` | One locale's `{ data }` envelope, with room for per-locale metadata later |
| `Author` | Backend-attested authorship; only `name` is required |

Plus the factories `createEntry` / `createProjectedEntry` and the guards
`isComplete` / `isProjected`.

## Complete vs projected

Search results and index-backed list views return entries whose unrequested
fields are missing. Those are `projected: true` and may be displayed but never
written back. Operations that write (draft creation, persist, publish) take
`CompleteEntry`, so passing a projection is a compile error whose fix is a
refetch, never a cast.

## What is deliberately not here

`raw` text, media listings, display labels, workflow status, and fetch-state
flags. They belong to the backend seam, the media-library store, collection
config, the workflow slice, and a request map respectively. See
`docs/contributing/decisions/` for the reasoning.

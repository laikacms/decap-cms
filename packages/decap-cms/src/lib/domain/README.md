# `lib/domain`

The CMS domain types, published as `@laikacms/decap-cms/lib/domain`. Every layer may import this
module; it imports nothing itself, so a type-only import pulls in no UI, store, or engine code.

The purity rule is enforced by the `local/layer-deps` ESLint rule, not by convention: a single
import here is a lint error.

## What lives here

| Type             | Meaning                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `Entry`          | `CompleteEntry \| ProjectedEntry`, discriminated by `projected`           |
| `CompleteEntry`  | An entry loaded in full; the only kind that may be written back           |
| `ProjectedEntry` | An entry from a projection; display only                                  |
| `EntryBase`      | The fields both share: identity and content                               |
| `LocaleVariant`  | One locale's `{ data }` envelope, with room for per-locale metadata later |
| `Author`         | Backend-attested authorship; only `name` is required                      |

Plus the factories `createEntry` / `createProjectedEntry` and the guards `isComplete` /
`isProjected`.

## Fields

### `EntryBase`

| Field        | Type                            | Meaning                                                                                                                                                                                        |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collection` | `string`                        | Name of the collection this entry belongs to, as configured.                                                                                                                                   |
| `slug`       | `string`                        | Identifier within the collection, unique among its entries. Derived from the path for folder collections and from the file's `name` for file collections; it is what URLs address an entry by. |
| `path`       | `string`                        | Where the entry is stored, relative to the repository or storage root.                                                                                                                         |
| `data`       | `Record<string, unknown>`       | The entry's field values, keyed by field name. For i18n collections this is the default locale's data.                                                                                         |
| `i18n?`      | `Record<string, LocaleVariant>` | Locale code to that locale's variant, for i18n collections.                                                                                                                                    |
| `author?`    | `Author`                        | Who last changed the entry, when the backend attests to it.                                                                                                                                    |
| `updatedOn?` | `string`                        | ISO-8601 timestamp of the last change, when the backend reports one.                                                                                                                           |
| `meta?`      | `{ path?: string }`             | Values held outside the entry's fields. `meta.path` is the user-editable path segment of collections configured with `meta.path`, which is why it is separate from the entry's own `path`.     |

`data` is intentionally untyped. A runtime-loaded config has no compile-time data shape, so typed
access happens at the edge through decoders derived from collection config that validate at runtime:
parse, don't cast.

### `Author`

| Field        | Type     | Meaning                                                                         |
| ------------ | -------- | ------------------------------------------------------------------------------- |
| `name`       | `string` | Display name. The only field every backend can be expected to supply.           |
| `id?`        | `string` | Stable per-user identifier (login, email, account id) when the backend has one. |
| `avatarUrl?` | `string` | Absolute URL of the author's avatar, when the backend exposes one.              |

Author fields come from backend-attested metadata only; nothing here is fabricated client-side.

## Complete vs projected

`projected` is the discriminant, and it answers one question: was this entry loaded in full, or does
it only carry the fields some index happened to store?

- **`projected: false`** (`CompleteEntry`) - every field the collection defines is present, so the
  entry can be edited, persisted and published without losing anything.
- **`projected: true`** (`ProjectedEntry`) - `data` holds only the projected fields. Search results
  and index-backed list views produce these. They are safe to display and unsafe to save: writing
  one back would delete every field the index does not keep.

Operations that write take `CompleteEntry`, so handing them a projection is a compile error. The fix
is always to refetch the entry, never to cast. This is not hypothetical: a search result overwrites
the cached entry for its slug, so an entry can be present and fresh in the store and still be a
projection.

## What is deliberately not here

`raw` text, media listings, display labels, workflow status, and fetch-state flags. They belong to
the backend seam, the media-library store, collection config, the workflow slice, and a request map
respectively. See
[the entry-type-redesign ADR](../../../../../docs/contributing/decisions/entry-type-redesign.md) for
the reasoning.

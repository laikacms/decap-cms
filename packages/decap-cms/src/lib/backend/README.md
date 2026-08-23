# `lib/backend`

The backend contract, published as `decap-cms/lib/backend`. An implementation should import this
module and nothing else from the CMS: the seam types live here, and the config types the contract
references plus the helpers implementations share are re-exported.

`lib/backend` may import `lib/domain` and nothing else; the `lib/util` re-exports below are the one
tracked exception, until those definitions move here physically.

## The seam

```ts
type BackendEntry = {
  file: { path: string, id?: string | null, author?: Author, updatedOn?: string },
  content: RawContent | ParsedContent,
};
```

`content` is a tagged union, built with `rawContent(text)` or `parsedContent(data)`:

- **`raw`** - the backend read text off disk/an API. The engine parses it with the collection's
  format, exactly as before.
- **`parsed`** - the backend's storage is already structured. The object is passed through to the
  domain entry by reference: no serializing a document just so the engine can parse it straight
  back.

The union is open. Producers are unaffected when a kind is added; consumers switch exhaustively and
end the switch with `assertNeverContent(content)`, so a new kind is a compile error at every site
that has to handle it.

### `file`

| Field        | Type             | Meaning                                                                                                                                                                    |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`       | `string`         | Where the entry is stored, relative to the repository or storage root.                                                                                                     |
| `id?`        | `string \| null` | Revision identifier (blob sha, document version, ...). `null` is an explicit "this backend does not version content", which is why it differs from the field being absent. |
| `author?`    | `Author`         | Who last changed the entry. Backend-attested only; never fabricated.                                                                                                       |
| `updatedOn?` | `string`         | ISO-8601 timestamp of the revision.                                                                                                                                        |

Report only what you actually know: omit a field rather than filling it with a placeholder. Unlike
the domain types, the optional fields here also accept an explicit `undefined`, so a value read
straight out of an API response can be passed along without a conditional spread. `Author` is a
`lib/domain` type, re-exported here so an implementation still imports this module and nothing else.

### `content`

| Variant         | Fields                                            | When to use it                                                                                                      |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `RawContent`    | `kind: 'raw'`, `raw: string`                      | Storage is files. `raw` is the text exactly as stored; the engine parses it with the collection's format.           |
| `ParsedContent` | `kind: 'parsed'`, `data: Record<string, unknown>` | Storage is documents. `data` is the entry's fields in the shape the format would have produced, taken by reference. |

## What changed from `CmsImplementation`

| Before                                        | Now                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `{ data: string, file: { … } }`               | `{ content: RawContent \| ParsedContent, file: { … } }`             |
| `file.author?: string`                        | `file.author?: Author` (`name` required, `id`/`avatarUrl` optional) |
| `file.label?: string` echoed back             | dropped - labels come from collection config                        |
| `CmsFileEntry`                                | `PersistPayload`                                                    |
| `UnpublishedEntry.pullRequestAuthor?: string` | `UnpublishedEntry.author?: Author`                                  |
| `CmsImplementationFile`                       | `BackendFileRef` (`{ path, id? }`, no `label`)                      |
| `CmsImplementation`                           | `BackendImplementation` (this module)                               |

`BackendImplementation` is the whole contract: `CmsImplementation`, the interface the engine used to
instantiate against, is gone rather than deprecated, so a backend written against it stops
compiling. That is the intent, and it is why the fold landed in 4.0 alongside the entry break
instead of after it - one migration for out-of-tree authors, not two. Both breaks are recorded in
`docs/contributing/decisions/breaking-changes-v4-beta.md`.

`BackendEntry` is likewise the only entry shape the engine accepts: there is no compatibility path
for the old `{ data: string }` entry, and `CmsImplementationEntry` is gone.

`authComponent()` returns `AuthComponent`, a structural stand-in for React's `ComponentType` that
covers function and class components alike. This module publishes no react dependency, so the type
is written out rather than imported; returning a real component satisfies it.

`entriesByFolder` / `entriesByFiles` (the helpers below) already return `BackendEntry`, so a
file-backed backend that builds its listings with them gets the seam shape for free and only has to
convert its own `getEntry`.

## Helpers

Re-exported from `lib/util` so implementations have one import: entry/media listing
(`entriesByFolder`, `entriesByFiles`, `getMediaAsBlob`, …), HTTP plumbing (`unsentRequest`,
`requestWithBackoff`, `APIError`, `responseParser`, …), `Cursor`, the editorial-workflow
branch/label conventions (`generateContentKey`, `statusToLabel`, …), `EntryLockManager`, and the
usual path/concurrency primitives.

## Debt

`DataFile`, `Asset`, `MediaFile`, and the `Cms*`-prefixed config types are aliases of definitions
that still live in `lib/util/types`. Relocating them is follow-up work; the public names here are
the stable ones.

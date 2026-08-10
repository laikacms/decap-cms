# Entry/domain type redesign: `lib/domain` + `lib/backend`, and the `BackendEntry` content union

**Status: Accepted.** Decided 2026-08-09 (grilling session), recorded 2026-08-10. Tracked as
DCMS-1907; the migration lands in six staged PRs, of which stages 0 and 1 have shipped.

## The problem

The entry type landscape had decayed into seven overlapping shapes with no single owner:

- `CmsEntryValue`, a dead public mirror nothing produced.
- `EntryValue` (engine) and `CmsEntry` (store/UI currency), two live near-duplicates split across
  namespaces.
- `EntryValueNoRaw` / `EntryValueNoData`, ad-hoc `Omit` variants invented to work around fields that
  did not belong on the type in the first place.
- `CmsImplementationEntry`, the backend seam, whose `data: string` means "raw text" while the
  domain's `data` means "structured fields".

Identity was polluted from three directions: fetch state (`isFetching`, `isPersisting`, `error`)
lived on the entity, so two entries with identical content compared unequal; view-dependent baggage
(`mediaFiles` differed by which fetch path produced the entry) and denormalized config (`label`)
rode along; and workflow fields were filler on most entries (`status: ''`, `isModification: null`,
`raw: ''`).

The costs were concrete. Backend implementers with structured storage had to serialize documents to
text purely so the engine could parse them straight back. Integrators building on the modular
dashboard direction had no UI-free type surface to import. And maintainers could not tell which
shape was authoritative, which is how `as unknown as` casts ended up exactly where the type system
mattered most: creating an editable draft from a possibly-trimmed search projection.

## The decision

Rebuild the entry domain around five types, each with one home and one audience, published through
two deliberately public subpaths.

### Two public surfaces

- **`lib/domain`**: pure domain types and factories (`Entry`, `LocaleVariant`, `Author`), importable
  by every layer, depending on nothing.
- **`lib/backend`**: everything a backend implementer needs (the contract, `BackendEntry`,
  `PersistPayload`, `UnpublishedEntry`, and the implementer helpers previously stranded in the
  `lib/util` grab-bag). It may import `lib/domain` and nothing else.

Everything else (engine, store, UI types) stays internal and free to churn. `lib/util` goes back to
being actual utilities. The config/collection types the contract references are re-exported from
`lib/backend` for self-containment; moving them there physically is recorded debt.

The purity rule is enforced by the `local/layer-deps` ESLint rule, not by convention: `lib/domain`
may import nothing at all, bare package specifiers included, and `lib/backend` only `lib/domain`,
with the `lib/util` re-export edge as its single grandfathered exception. A pure-types promise that
only lives in a README rots.

### Five entry types

| Type               | Home              | Audience                                        |
| ------------------ | ----------------- | ----------------------------------------------- |
| `BackendEntry`     | `lib/backend`     | backend implementers                            |
| `Entry`            | `lib/domain`      | everyone                                        |
| `EntryDraft`       | engine (internal) | the editor; gains `newRecord` and pending media |
| `PersistPayload`   | `lib/backend`     | backend implementers (was `CmsFileEntry`)       |
| `UnpublishedEntry` | `lib/backend`     | backend implementers; workflow metadata         |

### The seam carries a tagged content union

```ts
type RawContent = { kind: 'raw', raw: string };
type ParsedContent = { kind: 'parsed', data: Record<string, unknown> };
type BackendEntryContent = RawContent | ParsedContent; // open for future kinds, e.g. 'virtual'

type BackendEntry = {
  file: { path: string, id?: string | null, author?: Author, updatedOn?: string },
  content: BackendEntryContent,
};
```

Backends that store structured content hand it over as `ParsedContent` and the engine skips the
format parser entirely; text-based backends keep the `RawContent` path unchanged, at one mechanical
construction change. The discriminant is what makes the migration safe: an un-migrated construction
site fails to compile rather than silently changing meaning.

The union is open. Producers are unaffected when a kind is added; consumers switch exhaustively and
end with a `never`-checked default, so a new kind surfaces every affected site at compile time. A
declaration-merging kind registry was considered and rejected for now, since no processor plugin
surface exists to justify it; the union converts to that shape non-breakingly if one ever does.

### The domain entry is identity and content, nothing else

```ts
type EntryBase = {
  collection: string,
  slug: string,
  path: string,
  data: Record<string, unknown>,
  i18n?: Record<string, LocaleVariant>, // LocaleVariant = { data } envelope
  author?: Author, // { name, id?, avatarUrl? }, name required
  updatedOn?: string,
  meta?: { path?: string },
};
type Entry = (EntryBase & { projected: false }) | (EntryBase & { projected: true });
```

What was dropped, and where the concern went instead:

- **`raw`**: view-source becomes a future on-demand backend operation returning text plus a
  `synthesized` flag. Structured backends have no raw text to carry, and no entry should pay for a
  field only one feature reads.
- **`mediaFiles`**: media resolution belongs to the media-library store, keyed by folder/path;
  drafts carry pending uploads, and workflow views carry diff media.
- **`label`**: derived from collection config in selectors rather than denormalized onto every entry
  and echoed back through the seam. Implementations carry no presentation concerns.
- **`status` / `isModification`**: workflow views compose `{ entry, workflow }`.
- **fetch-state flags**: tracked in a `requests` map in the entries slice, keyed like the entities,
  with license to collapse into draft state later if only the editor reads it. `queryCore` remains
  the owner of the actual request lifecycle.

**`projected` is the safety property.** Search results and index-backed lists return entries whose
unrequested fields are missing. Those are `projected: true`: displayable, never writable.
Authoritative operations (draft creation, persist, publish) take `CompleteEntry`, so handing them a
projection is a compile error whose fix is a refetch, never a cast.

**`Entry.data` and `ParsedContent.data` are `Record<string, unknown>`, non-generic.** A generic
`Entry<TData>` was rejected: runtime-loaded YAML configs have no compile-time data shape, so the
generic would be unresolvable at exactly the boundary that matters and would breed
mismatch-then-cast pressure. Typed access happens at the edge, via decoders derived from collection
config that validate at runtime: parse, don't cast. Effect Schema is the candidate implementation
per `architecture.md`.

**`i18n` is an envelope, not a bare data map.** `LocaleVariant = { data }` costs one indirection now
and leaves room for per-locale metadata (its own status, updatedOn) without changing every consumer.

**`Author` is structured with only `name` required**, so backends can supply id and avatar later
without a breaking contract change. Author objects come from backend-attested metadata only; no
client-side fabrication of identity.

### Compiler contract

`exactOptionalPropertyTypes: true` repo-wide (~307 errors at flip time, swept in stage 0), so
absence and explicit-`undefined` are an enforced distinction rather than a convention that survives
until the next JSON boundary or spread merge. The convention: plain `?:` optionals, `| undefined`
only where an explicit undefined is genuinely meaningful (payload shapes assembled from what a
backend actually reported, callee-defaulted option bags, and React props, which JSX cannot omit
conditionally).

### Migration in six green stages

0. Revert the interim seam diff, salvaging its design-independent pieces; sweep
   `exactOptionalPropertyTypes`. **Shipped.**
1. Create `lib/domain` and `lib/backend`, unconsumed. **Shipped.**
2. Engine adopts `Entry`.
3. All backends adopt `BackendEntry`.
4. Media-off-entry and workflow composition, as separate PRs.
5. Deletions (`CmsEntryValue`, `EntryValue` and its variants and creators, `CmsEntry`), docs,
   downstream consumers, optional no-`as` lint rule.

The staging is the point: main never carries a half-migrated type system.

## Consequences

- **The seam break is loud and downstream.** Backends written against `CmsImplementation` stop
  compiling at stage 3 rather than misbehaving at runtime. Adapter migration for downstream
  consumers becomes a checklist; the break is recorded in `breaking-changes-v4-beta.md`.
- **Structured backends get faster and more faithful.** The parsed path adds zero serialize/parse
  round trips: content passes from backend to domain entry by reference. The raw path keeps today's
  single parse per entry.
- **Some ergonomics get worse before they get better.** Callers that reached for `entry.label` or
  `entry.mediaFiles` now go through a selector or the media store. That is the intended trade: the
  fields were convenient precisely because they were denormalized.
- **Type-level tests become load-bearing** for the public contracts (content-union narrowing,
  `CompleteEntry` rejecting projections, absence semantics). They are `expectTypeOf` specs, and are
  only as good as whether a tsc project actually checks them.
- **The interim implementation was deliberately discarded, not finished.** Optional
  `data`/`parsedData` on the seam plus an `EntryValueNoRaw` widening would have published a seam
  shape already agreed to break one stage later.
- **Two more public subpaths to version.** `lib/domain` and `lib/backend` are contracts now;
  changing them is a deliberate release decision rather than internal churn.

## Out of scope

The view-source feature itself (only its design door stays open), physically relocating the
config/collection types out of `lib/util`, a declaration-merging content-kind registry and any
processor plugin surface, the decoder implementation beyond the pattern decision, per-locale
workflow metadata, the ESM/type-stripping build migration, and renaming the `Cms*` prefix convention
outside the two new modules.

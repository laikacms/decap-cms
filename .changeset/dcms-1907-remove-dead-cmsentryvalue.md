---
'decap-cms': minor
---

Remove `CmsEntryValue` from `lib/util/types/cms/entries` (DCMS-1907). It was a dead public mirror
that nothing in the package ever produced; the live entry types are `Entry`/`CompleteEntry` from the
new `lib/domain` subpath and `BackendEntry` from `lib/backend`. This is the first deletion of the
entry/domain type redesign (see `docs/contributing/decisions/entry-type-redesign.md`); `EntryValue`
and `CmsEntry`, the internal engine/store types, are unaffected and remain in place until a later
stage of the migration.

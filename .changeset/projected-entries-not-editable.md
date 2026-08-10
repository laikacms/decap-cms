---
'@laikacms/decap-cms': patch
---

Never open a search projection for editing. Entries coming from a search index carry only the fields
that index stores, and a search result overwrites the cached entry for that slug, so an entry could
be fresh in the store and still be a projection. Opening one for editing would save it back over the
real entry, dropping every field the index does not keep. Such entries are now marked `projected`
(replacing the unenforced `partial` flag the Algolia integration set), everything that opens a draft
requires a complete entry at the type level, and a cached projection is refetched instead.

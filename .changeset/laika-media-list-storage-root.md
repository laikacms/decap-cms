---
'@laikacms/decap-cms': patch
---

backend-laika: list media from the storage folder the backend actually writes into, so the media
library stops reporting an empty library for a populated assets bucket.

The laika backend's media storage space is root-relative: `persistMedia` stores the bare filename,
`getStorageKey` strips `public_folder` off a path before `getMediaFile`/`deleteFiles` touch the
repository, and `getPublicPath` re-applies it on the way out. `getMedia`/`getMediaPage` were the
only operations that skipped that translation and passed `media_folder` to `listResources` verbatim,
so with the common `media_folder: assets/uploads` the listing asked the assets API for a prefix
nothing this backend can ever have written, and every Media tab open rendered "no media found"
against a bucket full of assets. Both now route the folder through a new `getStorageFolderKey`,
which strips a configured `public_folder`/`media_folder` prefix (mapping the media folder itself to
the root) and leaves any other folder key alone, so browsing into a sub-folder still addresses real
storage.

This supersedes the DCMS-1063 media_folder scoping. That change worked around an assets domain that
answered an unscoped folder key with `400 missing a collection prefix`; the ContentBase assets
repository now returns an empty list for a root folder key instead, precisely because the admin
queries without `filter[folder]` on every Media tab open.

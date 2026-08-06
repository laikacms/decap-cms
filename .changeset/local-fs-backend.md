---
'@laikacms/decap-cms': minor
---

Add a `local-fs` backend for local-first editing via the File System Access API (Chromium only).
Pick a directory once and edit content straight on disk, no proxy server needed; the picked
directory handle is persisted in IndexedDB across reloads. Config validation rejects the
unsupported `local-fs` + `editorial_workflow` combination at config time, and cancelling the folder
picker is a no-op instead of surfacing an AbortError.

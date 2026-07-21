---
"@laikacms/decap-cms": patch
---

Editorial workflow board: added a per-card "move to previous/next status" keyboard action (dispatching
the same `updateUnpublishedEntryStatus` code path as drag-and-drop) plus an `aria-live` region that
announces every status change, whether triggered by keyboard or drag (DCMS-1305 AC4-5).

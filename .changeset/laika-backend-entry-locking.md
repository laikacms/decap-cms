---
'@laikacms/decap-cms': minor
---

Implement server-arbitrated entry locking in the `laika` backend.

`LaikaBackend` now implements the four optional `CmsImplementation` lock methods
(`getEntryLock`/`acquireEntryLock`/`releaseEntryLock`/`refreshEntryLock`) against
`@laikacms/server/api`'s `/locks` endpoint, which is itself an adapter over the documents
repository's lock methods (ADR-007 in the `laikacms` repo). Two editors on different browsers now
see the same "Being edited by X" banner; previously the only implementation was `EntryLockManager`,
which shares locks between tabs of one browser and cannot arbitrate between users.

The client keeps the opaque lock token returned by acquire and replays it on refresh and release,
since the server authorises on the token rather than on identity. Tokens are dropped on `logout()`.
The owner is never sent: the server derives it from the authenticated principal, so a client cannot
take a lock as someone else.

Degradation is explicit: a `423` rejects so core raises the conflict banner, while a `501` (backend
cannot lock) or a transport failure resolves `null` so the editor hides the lock UI instead of
false-alarming a conflict or blocking the edit.

`CmsImplementation.acquireEntryLock` and `refreshEntryLock` are now typed
`Promise<CmsEntryLock | null>` rather than `Promise<CmsEntryLock>`. `Backend` already returned
`| null` and core already treated `null` as ENTRY_LOCK_UNSUPPORTED; the implementation signature was
the only place that claimed otherwise, which forced implementors into a cast to degrade.

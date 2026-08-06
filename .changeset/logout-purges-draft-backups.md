---
'@laikacms/decap-cms': patch
---

Purge local-draft backup entries on logout. Previously `Backend.logout()` left
`decap-cms:backup*` entries in localForage, so on a shared workstation the next user could get a
"Restore backup" prompt that hydrated the previous user's unsaved draft content. Logout now always
drops local drafts; reload-restore for a still-logged-in user is unaffected.

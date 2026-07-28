---
"@laikacms/decap-cms": minor
---

Added a top-level `field_groups` config map of name -> field list. Reference a group from any
collection/file/nested `object`/`list` field with `{ group: '<name>' }` in place of a regular field
entry; `normalizeConfig` expands it in place (deep-cloned, recursing into nested fields) before the
rest of the app ever sees a field, with a clear error for unknown or circular group references
(DCMS-1419).

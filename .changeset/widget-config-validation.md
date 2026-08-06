---
'@laikacms/decap-cms': patch
---

Tighten widget config validation: the boolean widget now has a config schema, and the file/image
widget schemas validate their `media_library` config instead of accepting anything.

---
'@laikacms/decap-cms': patch
---

Turn on `exactOptionalPropertyTypes` and adjust the type surface accordingly.
Optional properties that may legitimately carry an explicit `undefined` (backend
payload shapes like `CmsUser` and `MediaFile`, callee-defaulted option bags, and
React props forwarded through JSX) are now declared `?: T | undefined`;
properties that are genuinely absent stay `?:` and are built by omission.
Consumers compiling against these types with `exactOptionalPropertyTypes` off
are unaffected.

---
'@laikacms/decap-cms': minor
---

Add two public subpath exports: `@laikacms/decap-cms/lib/domain` (the domain entry types and
factories, importable with zero dependencies) and `@laikacms/decap-cms/lib/backend` (the backend
contract, the `BackendEntry` seam with its tagged `raw`/`parsed` content union, `PersistPayload`,
`UnpublishedEntry`, and the implementer helpers). Nothing consumes them yet: the engine and the
shipped backends still run on `CmsImplementation`, so this release changes no behavior.

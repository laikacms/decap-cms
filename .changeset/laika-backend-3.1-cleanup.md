---
'@laikacms/decap-cms': minor
---

Drop the `laika` backend's tolerance for pre-3.1 `laikacms` repositories. The content-sync surface
(`getSyncToken` / `listChanges`), the per-record `version` token, and the documents/assets capability
documents are now read through their declared types instead of structural probes; change support is
gated on `getCapabilities().changes` alone. Injecting a `DocumentsRepository` built against an older
`laikacms` is no longer supported.

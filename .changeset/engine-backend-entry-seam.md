---
'@laikacms/decap-cms': minor
---

The engine now reads entries through the `BackendEntry` seam. A backend may return an entry whose
`content` is `rawContent(text)` or `parsedContent(data)` instead of the old `data: string` field,
and structured content is carried into the entry by reference: no parse round trip, and no
registered entry codec needed. Backends returning the old shape keep working unchanged, so
implementations can move over one at a time.

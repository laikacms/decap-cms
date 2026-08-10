---
'@laikacms/decap-cms': minor
---

Every bundled backend now returns entries as `BackendEntry`. GitHub, GitLab, Gitea, Forgejo,
Bitbucket, Azure, Git Gateway, proxy, local FS and the test backend carry raw file text as
`rawContent(text)`; the Laika backend hands its stored documents over as `parsedContent(data)`, so
structured content no longer makes a round trip through JSON just for the engine to parse it back.
File authorship crosses the seam as an `Author` object rather than a bare name string, and the
display label is no longer echoed back (it comes from collection config).

The shared `entriesByFolder` / `entriesByFiles` / `allEntriesByFolder` helpers exported from
`@laikacms/decap-cms/lib/backend` return `BackendEntry[]` as a result.

**Breaking:** `{ data: string, file }` is no longer accepted anywhere, and the
`CmsImplementationEntry` type is removed. A custom backend must return `content: rawContent(text)`
(file storage) or `content: parsedContent(data)` (document storage) from `getEntry`,
`entriesByFolder`, `entriesByFiles`, `allEntriesByFolder` and `traverseCursor`. File authorship is
`file.author?: Author` rather than a name string, and `file.label` is no longer read.

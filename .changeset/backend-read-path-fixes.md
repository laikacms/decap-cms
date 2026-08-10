---
'@laikacms/decap-cms': patch
---

Fix two ways a backend could attribute an entry to the wrong thing.

GitLab's GraphQL read path fetched file content and authorship as two independently batched queries
and joined both back to the requested files by array index. Neither response is positionally
reliable: GitLab omits blobs for paths it cannot resolve, and a tree can report a null `lastCommit`.
Either one shifted every later file onto its predecessor's content or author. Both halves are now
keyed by path, which means the `blobs` query also selects `path`. A file GitLab returns no blob for
is reported as empty and warned about, rather than silently taking the next file's content.

The AWS Cognito GitHub proxy backend derived the acting account from the second segment of
`backend.repo`, so it reported the repository name where a GitHub login belongs (and built an avatar
URL, `github.com/<name>.png`, that only resolves for an account). It now uses the repo's owner.

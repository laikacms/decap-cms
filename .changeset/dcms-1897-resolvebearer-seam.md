---
'decap-cms': minor
---

Route `decap-cms/ai`'s bearer verification through the `resolveBearer -> { user, scopes }`
seam (DCMS-1897). `User.scopes` and `DecapAiConfig.requiredScope` let a consumer's
`authenticateAccessToken` spread a `resolveBearer` result (`{ ...ctx.user, scopes: ctx.scopes }`,
whether from `decap-cms-lib-pat`'s `resolveBearer` in this repo or the parallel `the external auth service`
implementation server-side) instead of treating "authenticated" as "full admin". `decapAi` now
enforces `requiredScope` (default `content:write`, since the AI can edit documents via
`updateDocument`) via `hasScope` semantics: open `resource:action` scopes plus `admin`/`resource:*`
wildcards. A `user.scopes` of `undefined` keeps today's full-access behaviour, matching
`resolveBearer`'s own "omitted means full admin" convention, so this is backwards compatible.
`hasScope`, `requireScope`, `resolveBearer`, and the `Scope`/`AuthContext` types are now re-exported
from `decap-cms/ai` so consumers do not need a separate `decap-cms-lib-pat` dependency to
build the seam. `decap-cms-lib-pat` itself is untouched; it stays the full, fleet-owned
implementation (see `docs/contributing/learnings/dcb-002-authorization-model.md`).

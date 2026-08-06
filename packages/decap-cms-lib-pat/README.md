# decap-cms-lib-pat

CMS-issued scoped Personal Access Token (PAT) primitives for Decap CMS-based
servers: minting, hashing at rest, and bearer verification.

This library is server-side only (Node `crypto`). It does not touch storage
or transport -- callers inject a `lookupPatByHash` and a `verifySessionToken`
function and get back a single seam that resolves any bearer string to
`{ user, scopes }`.

## Scope vocabulary

Scopes follow a `resource:action` convention and are an **open vocabulary**.
The CMS ships these well-known defaults:

`content:read` | `content:write` | `media:read` | `media:write` | `config:read`

Consumers building custom dashboards (Decap CMS supports injected React
components) or fronting a non-CMS surface (e.g. a B2B shop) may grant their own
namespaced scopes, such as `shipping:read` or `orders:write` -- this library
validates the `resource:action` shape, it does not restrict the vocabulary.

Wildcards:

- `admin` (or the equivalent `*`) grants every scope.
- `resource:*` grants every action on that resource (e.g. `content:*` grants
  both `content:read` and `content:write`).

Wildcard membership is resolved at check time by `hasScope`; stored scope sets
are never expanded (an open vocabulary has no enumerable "all"). Use
`normalizeScopes` to canonicalize a set for storage (dedupe; collapse a global
grant to a single `admin`).

## Usage

```ts
import { mintPersonalAccessToken, resolveBearer, requireScope } from 'decap-cms-lib-pat';

// Minting (e.g. from an admin "create token" action)
const { token, record } = mintPersonalAccessToken(
  { userId: user.id, scopes: ['content:read', 'media:read'], name: 'ci-agent' },
  { generateId: () => uuid() },
);
// `token` is shown to the caller exactly once. Persist `record` (hash only).

// Verifying a bearer (the shared seam for REST/MCP)
const ctx = await resolveBearer(req.headers.authorization?.replace(/^Bearer /, ''), {
  verifySessionToken: bearer => verifyOAuthAccessToken(bearer), // existing OAuth seam, untouched
  lookupPatByHash: hash => db.pats.findByHash(hash),
  onPatUsed: record => db.pats.touchLastUsed(record.id),
});
if (!ctx) throw new UnauthorizedError();

// Enforcement
requireScope(ctx, 'content:write'); // throws InsufficientScopeError if not granted
```

## What's deferred

This package ships token minting, hashing, the `{user, scopes}` bearer
resolution seam, and scope enforcement -- fully tested. It does **not**
include:

- Wiring `resolveBearer` into the live `decap-api authorize(ctx)` hook
  (that seam lives in `laikacms/laikacms`, a separate private repo).
- Storage adapters (SQL/DynamoDB) for `PatRecord` -- consumers bring their
  own; the shape is storage-agnostic on purpose.
- The admin management UI (create with scope picker, show-once, list,
  revoke).

See [DCMS-1409](https://github.com/laikacms/decap-cms/issues/1409).

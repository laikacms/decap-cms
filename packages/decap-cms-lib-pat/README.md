# decap-cms-lib-pat

CMS-issued scoped Personal Access Token (PAT) primitives for Decap CMS-based
servers: minting, hashing at rest, and bearer verification.

This library is server-side only (Node `crypto`). It does not touch storage
or transport -- callers inject a `lookupPatByHash` and a `verifySessionToken`
function and get back a single seam that resolves any bearer string to
`{ user, scopes }`.

## Scope vocabulary

`content:read` | `content:write` | `media:read` | `media:write` |
`config:read` | `admin` (implies all of the above).

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

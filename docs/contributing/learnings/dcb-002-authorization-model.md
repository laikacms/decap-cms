# dcb-002: authorization model for CMS-issued credentials

Discovered while comparing `decap-cms-lib-pat` (this repo) against `decap-oauth2` and `decap-api`
(the `@laikacms/decap` packages in the `laikacms/laika-cms` repo), to decide whether the three
overlap and what the permission model should be. Records the judgement call so we do not relitigate
it when wiring PATs into the live API or when a consumer needs custom scopes.

> **Status update (2026-08-06): the "reduce `decap-cms-lib-pat` to types-only" step was ABANDONED.**
> The autonomous fleet is actively hardening `decap-cms-lib-pat` as the full implementation
> (DCMS-1894 added `UnauthorizedError` + a README pinning test), so `lib-pat` stays a complete
> implementation in this repo. The scope/PAT mechanism was still added to `laikacms/auth` in the
> `laika-cms` repo (the laika-side server graph, including the planned `laikacms/mcp` core subpath,
> cannot import back into `decap-cms`), so the implementation now lives in BOTH places by choice, not
> as debt to collapse. Do NOT gut `lib-pat` without coordinating with the fleet first. The reasoning
> below stands; only the single-implementation goal did not.

## The three packages are three layers, not duplicates

- `decap-oauth2` is an **authorization server**: it issues credentials (PKCE OAuth flow,
  email/password, passkey, TOTP, password reset). It proves identity and mints session + refresh
  tokens. It is self-contained and does not need the CMS API to exist.
- `decap-api` is a **resource server**: the Decap REST backend (`/documents`, `/storage`,
  `/assets`, `/session`, `/locks`). It consumes credentials via injected `authenticateAccessToken` /
  `authenticateApiToken`, then runs a single `authorize(ctx)` gate. Its `feat(decap)!: split
  authentication from authorization` commit made `authorize(ctx) => boolean` the only access
  decision and left `User` module-augmentable.
- `decap-cms-lib-pat` is neither. It is a **credential + scope library**: mint scoped, hashed,
  revocable PATs, plus `resolveBearer(bearer) => { user, scopes }` and `requireScope` enforcement.
  For non-PAT bearers it delegates to an injected `verifySessionToken` (which is where
  `decap-oauth2` plugs in), so it sits on top of oauth2, it does not reimplement it. A PAT is
  effectively a scoped, hashed, revocable version of `decap-api`'s existing (unscoped) API-key hook.

## RBAC vs scopes is a false dichotomy

The two are not competitors at one layer. There are three layers, each wanting a different thing:

1. **Enforcement (API boundary)**: `authorize(ctx) => boolean`, a policy function (PBAC/ABAC). It
   already subsumes RBAC, scopes, ownership, tenancy, and conditional rules. Keep it. Do not replace
   it with a hardcoded scope check or a role enum.
2. **Capability data (the token)**: what a credential may do, in serializable form. This is
   'scopes'.
3. **Identity data (the user/directory)**: who someone is (roles, org, tenant). This is 'RBAC'.

Roles are not a rival to scopes; **roles are a consumer-owned way to compute scopes**. A user has
roles, a token carries scopes, and the role to scope mapping happens server-side at login or mint
and is the consumer's data. In a B2B example, `admin` / `shipping` / `sales` sound like scopes but
are really roles that map to scopes like `orders:read`, `shipments:write`.

## The decision

Scope-based on the wire, **open vocabulary**, policy-function enforcement, RBAC as optional sugar.

- Scopes are the lingua franca: OAuth-native, they subset cleanly (a CI PAT of `content:read` makes
  sense; '30% of the editor role' does not, which is why lib-pat models 'PAT scopes are a subset of
  the user's scopes'), and agent/MCP tokens want fine-grained capability grants.
- The scope vocabulary must be **open**, not a closed enum. `decap-cms` is now a fork that supports
  custom dashboards and injected React components, and `decap-oauth2` may front non-CMS surfaces
  (for example a B2B shop). A closed union like `Scope = 'content:read' | ... | 'admin'` cannot name
  `shipping:read`. Treat scopes as a `resource:action` string convention with the CMS scopes shipped
  as well-known constants, keep `admin` as a well-known wildcard, and support `resource:*` / `*` so
  custom namespaces get the same admin-implies-all ergonomics.

## What each layer must (and must not) do

- `decap-oauth2`: authenticate and **carry consumer claims opaquely**. No role or permission
  semantics in the protocol engine. But it must let the consumer stamp arbitrary claims (scopes,
  roles, org, tenant) at `createSession` and surface them at `getSessionByAccessToken`, or scopes
  never reach the enforcement point. The current `SessionVerificationResult.scopes?` defaulting to
  full-admin is the thing to fix, not the delegation model.
- `decap-api`: keep `authorize(ctx)` as the consumer policy. Optionally ship a
  `requiredScopeFor(domain, operation)` helper plus a `hasScope`-based default policy as opt-in
  convenience for the plain-CMS case.
- `decap-cms-lib-pat`: open the `Scope` type, keep CMS scopes as exported constants, add wildcard
  expansion. Backward-compatible.

## Where scopes cannot reach

Some rules are not expressible as a static capability on a token, no matter the namespace, and need
the policy function with `ctx.request` plus an augmented `User`:

- instance-level ('edit only your own posts'): needs `ctx.itemId` plus an ownership lookup.
- relationship-based / ReBAC ('editors of collection X'): needs a lookup.
- conditional / ABAC: business hours, IP allowlist, tenant isolation.

Scopes answer the coarse 'may this credential touch this resource:action'; the policy function
answers the fine '...given this item, owner, tenant, and time'. You need both: scopes are the data,
the policy function is the enforcement.

## Do not ship only the escape hatch

'Consumer writes their own `authorize` callback' is correct but has a usability cliff: the plain-CMS
user who wants 'viewers read, editors write' should not have to author a policy from scratch (most
get it subtly wrong and fail open). Split it:

- **Core stays unopinionated**: no roles baked in, consumer owns directory and policy.
- **Ship an optional, separable preset**: a default `(domain, operation) -> scope` table and a
  `createScopePolicy()` that drops into `authorize` in one line, living outside the auth engine. The
  B2B shop ignores it and writes its own; the blog adopts it. A light RBAC-over-scopes convenience
  (role to scope map as data) can live here, never as an enum inside the oauth2 or decap-api core.

## Related

- Roles get assigned and mapped to scopes in the directory / admin-UI layer, which is
  [DCMS-1405](https://github.com/laikacms/decap-cms/issues/1405) (user management with roles). Keep
  it there, feeding scopes into oauth2's session, not as an enum in the auth core. DCMS-1405 is one
  of the features still to be ported forward (see issue #1882).
- PAT primitives: [DCMS-1409](https://github.com/laikacms/decap-cms/issues/1409) and
  `packages/decap-cms-lib-pat/README.md`.
- Cross-repo: `decap-api` and `decap-oauth2` currently live in `laikacms/laika-cms`; per the EmDash
  plan, packages are meant to converge into `decap-cms`, at which point the wired-together auth story
  (open scopes + claim transport + optional default policy) should land here.

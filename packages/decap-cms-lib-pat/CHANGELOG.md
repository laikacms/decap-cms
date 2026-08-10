# decap-cms-lib-pat

## 0.2.0

### Minor Changes

- 55fb7c8: Open the scope vocabulary: `Scope` is now any `resource:action` string instead of a closed CMS
  enum, with the CMS scopes kept as well-known constants (`GRANULAR_SCOPES`). Adds `WILDCARD_SCOPE`
  (`*`) and resource-level wildcards (`content:*` etc), resolved by `hasScope` at check time.
  `expandScopes` is replaced by `normalizeScopes` (dedupe plus collapse of a global grant to
  `admin`), a scopeless session now resolves to `['admin']`, and `UnauthorizedError` is exported.

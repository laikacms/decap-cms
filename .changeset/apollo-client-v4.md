---
'@laikacms/decap-cms': patch
---

Replace the legacy Apollo GraphQL stack with `@apollo/client` v4.

The GitHub and GitLab GraphQL backends (`use_graphql: true`) now use `@apollo/client` v4 instead of
the deprecated `apollo-client` 2.x packages (`apollo-client`, `apollo-cache-inmemory`,
`apollo-link-http`, `apollo-link-context`). Behavior is unchanged: same queries, fetch policies, and
cache updates, with the v4 client configured not to send Apollo's client-awareness telemetry
extension to Git hosts.

**Migration (only if you use `use_graphql: true`):** swap the optional peer dependencies:

```sh
pnpm remove apollo-client apollo-cache-inmemory apollo-link-http apollo-link-context
pnpm add @apollo/client rxjs
```

`graphql` and `graphql-tag` remain optional peers; `rxjs` is required by `@apollo/client` v4.

# GitHub backend

An abstraction layer between the CMS and [GitHub](https://docs.github.com/en/rest)

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`Api` - A wrapper for GitHub REST API.

`GraphQLApi` - `Api` with `ApolloClient`. [Api docs](https://docs.github.com/en/graphql) and [netlify docs](https://www.decapcms.org/docs/beta-features/#github-graphql-api).

`AuthenticationPage` -  uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md) to facilitate OAuth and implicit authentication.

`scripts` -  use `createFragmentTypes.js` to create GitHub GraphQL API fragment types.

Look at tests or types for more info.

## `backend:` config keys

Beyond `name`, `repo` and `branch`, the `backend:` block also supports the following options:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `open_authoring` | boolean | `false` | Enables the [Open Authoring](https://www.decapcms.org/docs/open-authoring/) workflow, where users without write access fork the repo and contribute via pull requests. Requires `publish_mode: editorial_workflow`; the `Implementation` constructor throws otherwise. |
| `always_fork` | boolean | `false` | When `true`, forces all users (including those with write access) to work from a fork rather than committing directly to the origin repo. |
| `api_root` | string | `https://api.github.com` | Base URL for GitHub REST API requests. Override for GitHub Enterprise. |
| `graphql_api_root` | string | value of `api_root` | Base URL for GitHub GraphQL API requests. Override for GitHub Enterprise when it differs from the REST root. |
| `squash_merges` | boolean | `false` | When `true`, squashes commits when merging editorial workflow pull requests. |
| `cms_label_prefix` | string | `''` | Prefix added to the labels the CMS uses to track editorial workflow status on pull requests. |
| `use_graphql` | boolean | `false` | When `true`, uses `GraphQLApi` instead of `Api` for read operations. |
| `preview_context` | string | `''` | Context string used for the GitHub commit status/deployment preview link shown in the editorial workflow. |

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is.
2. If `branch` is not set, `authenticate()` fetches the repository info from the GitHub API (`GET /repos/{owner}/{repo}`) and uses `default_branch` from the response.
3. If the API fetch fails (network error, auth error, etc.), the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the repository's own default branch as reported by GitHub.

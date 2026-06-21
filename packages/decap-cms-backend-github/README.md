# GitHub backend

An abstraction layer between the CMS and [GitHub](https://docs.github.com/en/rest)

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`Api` - A wrapper for GitHub REST API.

`GraphQLApi` - `Api` with `ApolloClient`. [Api docs](https://docs.github.com/en/graphql) and [netlify docs](https://www.decapcms.org/docs/beta-features/#github-graphql-api).

`AuthenticationPage` -  uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md) to facilitate OAuth and implicit authentication.

`scripts` -  use `createFragmentTypes.js` to create GitHub GraphQL API fragment types.

Look at tests or types for more info.

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is.
2. If `branch` is not set, `authenticate()` fetches the repository info from the GitHub API (`GET /repos/{owner}/{repo}`) and uses `default_branch` from the response.
3. If the API fetch fails (network error, auth error, etc.), the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the repository's own default branch as reported by GitHub.

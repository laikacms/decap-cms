# GitHub backend

An abstraction layer between the CMS and the [GitHub REST API](https://docs.github.com/en/rest)
(and, optionally, the [GitHub GraphQL API](https://docs.github.com/en/graphql)).

## Code structure

`implementation.tsx` - `Implementation` for the file management system, based on `API`. With
[Editorial Workflow](https://www.decapcms.org/docs/beta-features/#gitlab-and-bitbucket-editorial-workflow-support)
uses pull request labels to track unpublished entries statuses. Also implements
[Open Authoring](https://www.decapcms.org/docs/open-authoring/), which forks the repo for
contributors without direct write access.

`API.tsx` - A wrapper for the GitHub REST API.

`GraphQLAPI.tsx` - An optional GraphQL-backed variant of the API, used when `use_graphql` is enabled
(see below). Wired up via the separate `@laikacms/decap-cms/backends/github/graphql` entry point
(which calls `registerGraphQLAPI`) so the GraphQL client libraries stay optional peer dependencies.

`AuthenticationPage.tsx` - A component that facilitates OAuth and implicit authentication.

Look at tests or types for more info.

## `backend:` config keys

Beyond `name`, `repo` and `branch`, the `backend:` block also supports the following options:

| Key                | Type    | Default                    | Description                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open_authoring`   | boolean | `false`                    | Enables [Open Authoring](https://www.decapcms.org/docs/open-authoring/): contributors without write access to `repo` work against a fork instead. Requires `publish_mode: editorial_workflow` — the constructor throws `'backend.open_authoring is true but publish_mode is not set to editorial_workflow.'` if that's not set. |
| `api_root`         | string  | `'https://api.github.com'` | Base URL for the GitHub REST API. Override for GitHub Enterprise Server instances (e.g. `https://github.example.com/api/v3`).                                                                                                                                                                                                   |
| `squash_merges`    | boolean | `false`                    | When `true`, pull requests created for the editorial workflow are merged with the `squash` merge method instead of a merge commit.                                                                                                                                                                                              |
| `cms_label_prefix` | string  | `''`                       | Prefix added to the pull request labels the CMS uses to track editorial workflow status.                                                                                                                                                                                                                                        |
| `use_graphql`      | boolean | `false`                    | When `true`, the backend reads/writes through GitHub's GraphQL API instead of the REST API. Requires importing `@laikacms/decap-cms/backends/github/graphql` (which calls `registerGraphQLAPI`) and installing its optional GraphQL peer dependencies — `authenticate()` throws otherwise.                                      |
| `preview_context`  | string  | `''`                       | Context string used to look up the deploy preview status/link shown in the editorial workflow, matched against commit statuses on the pull request.                                                                                                                                                                             |

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is (trimmed).
2. If `branch` is not set, `authenticate()` fetches the repository info from the GitHub API
   (`GET {api_root}/repos/{originRepo}`) and uses `default_branch` from the response.
3. If the API fetch fails (network error, auth error, etc.), or the response has no
   `default_branch`, the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the
> repository's own default branch as reported by GitHub.

## Example

```yaml
backend:
  name: github
  repo: owner/repo
  branch: main
  api_root: https://github.example.com/api/v3
  squash_merges: true
  cms_label_prefix: "decap-cms/"
  use_graphql: true
  preview_context: "vercel"
  open_authoring: true
publish_mode: editorial_workflow
```

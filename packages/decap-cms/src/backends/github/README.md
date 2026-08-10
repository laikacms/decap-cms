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

| Key                | Type    | Default                                                       | Description                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open_authoring`   | boolean | `false`                                                       | Enables [Open Authoring](https://www.decapcms.org/docs/open-authoring/): contributors without write access to `repo` work against a fork instead. Requires `publish_mode: editorial_workflow` — the constructor throws `'backend.open_authoring is true but publish_mode is not set to editorial_workflow.'` if that's not set. |
| `always_fork`      | boolean | `false`                                                       | Only relevant when `open_authoring` is `true`. Normally, Open Authoring skips forking for users who already have write access to `repo` (they're treated as origin maintainers). When `true`, `authenticateWithFork()` always forks instead, even for maintainers.                                                              |
| `api_root`         | string  | `'https://api.github.com'`                                    | Base URL for the GitHub REST API. Override for GitHub Enterprise Server instances (e.g. `https://github.example.com/api/v3`).                                                                                                                                                                                                   |
| `base_url`         | string  | `'https://api.netlify.com'`                                   | Base URL of the OAuth endpoint used by the login popup (`NetlifyAuthenticator`, i.e. the self-hosted `git-gateway`/OAuth proxy). Also passed through to the underlying `API`/`GraphQLAPI` client, though it is not currently read there. Unrelated to `api_root`, which is the GitHub REST API endpoint itself.                 |
| `auth_scope`       | string  | `'repo'` (or `'public_repo'` when `open_authoring` is `true`) | OAuth scope requested during login. Read by `AuthenticationPage.tsx`, not `implementation.tsx`.                                                                                                                                                                                                                                 |
| `squash_merges`    | boolean | `false`                                                       | When `true`, pull requests created for the editorial workflow are merged with the `squash` merge method instead of a merge commit.                                                                                                                                                                                              |
| `cms_label_prefix` | string  | `''`                                                          | Prefix added to the pull request labels the CMS uses to track editorial workflow status.                                                                                                                                                                                                                                        |
| `use_graphql`      | boolean | `false`                                                       | When `true`, the backend reads/writes through GitHub's GraphQL API instead of the REST API. Requires importing `@laikacms/decap-cms/backends/github/graphql` (which calls `registerGraphQLAPI`) and installing its optional GraphQL peer dependencies — `authenticate()` throws otherwise.                                      |
| `preview_context`  | string  | `''`                                                          | Context string used to look up the deploy preview status/link shown in the editorial workflow, matched against commit statuses on the pull request.                                                                                                                                                                             |
| `large_media_url`  | string  | `https://github.com/{repo}.git/info/lfs`                      | Base URL of the Git LFS batch endpoint. Override for GitHub Enterprise Server or a separately hosted LFS server. See [Git LFS](#git-lfs) below.                                                                                                                                                                                 |

## Git LFS

Media tracked by [Git LFS](https://git-lfs.com/) is handled transparently, so an editor uploading a
`.psd` to an LFS-tracked path gets LFS behavior without configuring anything in the CMS.

On first use the backend reads `.gitattributes` from the repo and collects every pattern marked
`filter=lfs diff=lfs merge=lfs`. If there are none (or the file doesn't exist), LFS support stays
off and every path below short-circuits, so repos that don't use LFS pay nothing but one cached 404.

When it is on:

- **Upload** - `persistMedia` and `persistEntry` upload the real bytes through the LFS batch API and
  commit a pointer file in their place, for assets whose path matches a tracked pattern.
- **Download** - unlike GitLab's raw-content API, GitHub's contents/blobs API hands back the raw
  pointer text rather than resolving it. So every media read goes through a wrapper that detects a
  pointer file (small, and starting with the LFS version line) and swaps in the real object bytes
  fetched from the batch endpoint. A resolve failure degrades to the pointer blob and logs, rather
  than failing the surrounding entry load.

Auth reuses the backend's own token, so no separate LFS credential is needed. The client itself is
shared with the Bitbucket backend (`@/lib/util/git-lfs-client`).

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
  always_fork: true
publish_mode: editorial_workflow
```

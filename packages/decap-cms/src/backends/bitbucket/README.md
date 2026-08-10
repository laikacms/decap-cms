# Bitbucket backend

An abstraction layer between the CMS and
[Bitbucket](https://developer.atlassian.com/cloud/bitbucket/rest/).

## Code structure

`implementation.tsx` - `Implementation` for the file management system, based on `Api` and
`LargeMedia` (LFS). With
[Editorial Workflow](https://www.decapcms.org/docs/beta-features/#gitlab-and-bitbucket-editorial-workflow-support)
uses pull request comments to track unpublished entries statuses.

`API.tsx` - A wrapper for the Bitbucket REST API.

Git LFS support comes from the shared `@/lib/util/git-lfs-client` client, pointed at Bitbucket's own
LFS batch endpoint. The GitHub backend uses the same client.

`AuthenticationPage.tsx` - A component that facilitates OAuth and implicit authentication.

Look at tests or types for more info.

## `backend:` config keys

Beyond `name`, `repo` and `branch`, the `backend:` block also supports the following options:

| Key                | Type    | Default                                 | Description                                                                                                                                                                                                   |
| ------------------ | ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `large_media_url`  | string  | `https://bitbucket.org/{repo}/info/lfs` | Base URL used to fetch Git LFS pointer file contents for media stored via Large Media. Override when LFS is served from a different host (e.g. a self-hosted LFS server).                                     |
| `squash_merges`    | boolean | `false`                                 | When `true`, squashes commits when merging editorial workflow pull requests (`mergeStrategy` becomes `'squash'` instead of `'merge_commit'`).                                                                 |
| `cms_label_prefix` | string  | `''`                                    | Prefix added to the labels the CMS uses to track editorial workflow status on pull requests.                                                                                                                  |
| `preview_context`  | string  | `''`                                    | Context string used to look up the deploy preview status/link shown in the editorial workflow.                                                                                                                |
| `api_root`         | string  | `'https://api.bitbucket.org/2.0'`       | Base URL for the Bitbucket REST API. Passed to the `Api` constructor and used to fetch repository info (e.g. default branch resolution). Override for self-hosted or region-specific Bitbucket API endpoints. |
| `auth_type`        | string  | `''`                                    | Authentication flow used by `AuthenticationPage`. When set to `'implicit'`, the backend skips refresh-token handling and treats the access token as non-renewable.                                            |

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is.
2. If `branch` is not set, `authenticate()` fetches the repository info from the Bitbucket API
   (`GET /repositories/{repo}`) and uses `mainbranch.name` from the response.
3. If the API fetch fails (network error, auth error, etc.), the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the
> repository's own default branch as reported by Bitbucket.

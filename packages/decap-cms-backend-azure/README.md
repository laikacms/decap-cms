# Azure backend

An abstraction layer between the CMS and [Azure DevOps](https://docs.microsoft.com/en-us/rest/api/azure/devops/git/)

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`Api` - A wrapper for Azure DevOps REST API.

`AuthenticationPage` - facilitates implicit authentication flow. Uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md).

Look at tests or types for more info.

## `backend:` config keys

Beyond `name`, `repo` and `branch`, the `backend:` block also supports the following options:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `api_root` | string | `https://dev.azure.com` | Base URL used to build the Azure DevOps REST API endpoint. Override when using an Azure DevOps Server (on-premises) instance instead of the `dev.azure.com` cloud service. |
| `api_version` | string | `6.1-preview` | Azure DevOps REST API version sent as the `api-version` query parameter on every request. |
| `squash_merges` | boolean | `false` | When `true`, squashes commits when completing editorial workflow pull requests (`mergeStrategy` becomes `'squash'` instead of `'noFastForward'`). |
| `cms_label_prefix` | string | `''` | Prefix added to the labels the CMS uses to track editorial workflow status on pull requests. |
| `preview_context` | string | `''` | Context string used to look up the deploy preview status/link shown in the editorial workflow. |

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is.
2. If `branch` is not set, `authenticate()` fetches the repository info from the Azure DevOps API (`GET /_apis/git/repositories/{repositoryId}`) and uses `defaultBranch` from the response.
3. If the API fetch fails (network error, auth error, etc.), the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the repository's own default branch as reported by Azure DevOps.

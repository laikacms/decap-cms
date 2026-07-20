# Azure backend

An abstraction layer between the CMS and
[Azure DevOps](https://learn.microsoft.com/en-us/rest/api/azure/devops/).

## Code structure

`implementation.tsx` - `Implementation` for the file management system, based on `API`. With
[Editorial Workflow](https://www.decapcms.org/docs/beta-features/#gitlab-and-bitbucket-editorial-workflow-support)
uses pull request labels to track unpublished entries statuses.

`API.tsx` - A wrapper for the Azure DevOps Git REST API.

`AuthenticationPage.tsx` - A component that facilitates implicit OAuth authentication against Azure
AD.

Look at tests or types for more info.

## `backend:` config keys

Beyond `name` and `branch`, the `backend:` block also supports the following options:

| Key                | Type    | Required        | Default                   | Description                                                                                                                                                  |
| ------------------ | ------- | --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo`             | string  | yes             | —                         | The target repository, in the form `{org}/{project}/{repo}`. Parsed by `parseAzureRepo` (`implementation.tsx`); any other shape throws at construction time. |
| `tenant_id`        | string  | yes (for login) | —                         | Azure AD tenant ID. Used to build the OAuth authorize URL: `https://login.microsoftonline.com/{tenant_id}` (`AuthenticationPage.tsx`).                       |
| `app_id`           | string  | yes (for login) | `''`                      | Azure AD application (client) ID used for the implicit OAuth flow.                                                                                           |
| `api_root`         | string  | no              | `'https://dev.azure.com'` | Base URL for the Azure DevOps REST API. Override for on-premises Azure DevOps Server instances.                                                              |
| `api_version`      | string  | no              | `'6.1-preview'`           | Azure DevOps REST API version sent as the `api-version` query parameter on every request.                                                                    |
| `squash_merges`    | boolean | no              | `false`                   | When `true`, pull requests created for the editorial workflow are completed with `mergeStrategy: 'squash'` instead of `'noFastForward'`.                     |
| `cms_label_prefix` | string  | no              | `''`                      | Prefix added to the pull request labels the CMS uses to track editorial workflow status.                                                                     |
| `preview_context`  | string  | no              | `''`                      | Context string used to look up the deploy preview status/link shown in the editorial workflow.                                                               |

## Branch resolution

The `branch` config option is optional and defaults to `'master'` if unset
(`config.backend.branch || 'master'` in `implementation.tsx`). Unlike the GitLab and Bitbucket
backends, the Azure backend does not fetch the repository's default branch from the API — the
fallback is always the literal string `'master'`.

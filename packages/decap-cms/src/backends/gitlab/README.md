# GitLab backend

An abstraction layer between the CMS and [GitLab](https://docs.gitlab.com/ee/api/README.html).

## Code structure

`implementation.ts` - `Implementation` for the file management system, based on `Api`. With
[Editorial Workflow](https://www.decapcms.org/docs/beta-features/#gitlab-and-bitbucket-editorial-workflow-support)
uses merge request labels to track unpublished entries statuses.

`API.tsx` - A wrapper for the GitLab REST API.

`GraphQLAPI.tsx` - An optional GraphQL-backed variant of the API, used when `use_graphql` is
enabled (see below). Wired up via the separate `@laikacms/decap-cms/backends/gitlab/graphql` entry
point so the GraphQL client libraries stay optional peer dependencies.

`AuthenticationPage.tsx` - A component that facilitates OAuth, PKCE and implicit authentication.

Look at tests or types for more info.

## Branch resolution

The `branch` config option is optional. Resolution order on login:

1. If `branch` is set in the backend config, that value is used as-is.
2. If `branch` is not set, `authenticate()` calls `getDefaultBranchName()` which fetches the repository info from the GitLab API and uses the default branch from the response.
3. If the API fetch fails (network error, auth error, etc.), the value falls back to `'master'`.

> **Note:** Docs that say "defaults to `master`" are inaccurate — the real default is the repository's own default branch as reported by GitLab.

## Additional `backend` config keys

These `backend:` keys are read by `implementation.ts` but are not covered by the `gitlab`
section of the main decapcms.org docs:

- `squash_merges` (boolean, default `false`): when `true`, merge requests created for
  the editorial workflow are squash-merged on publish. Passed straight through to the
  GitLab "merge merge request" API call's `squash` parameter.
- `preview_context` (string, default `''`): the commit status `context` value used to
  pick a deploy-preview status out of the merge request's commit statuses (see
  `getDeployPreview`). Same purpose as `preview_context` on the GitHub backend — if
  unset, a status is matched by keyword against common deploy-preview provider names
  instead of an exact context match.
- `use_graphql` (boolean, default `false`): when `true`, the backend batches file reads
  through GitLab's GraphQL API instead of the REST API. Requires importing
  `@laikacms/decap-cms/backends/gitlab/graphql` (which calls `registerGraphQLAPI`) and
  installing its optional GraphQL peer dependencies; otherwise `authenticate()` throws.
- `graphql_api_root` (string, default `'https://gitlab.com/api/graphql'`): the GraphQL
  endpoint used when `use_graphql` is enabled. Passed to the GraphQL API constructor
  alongside the usual `apiRoot`/token/repo options.

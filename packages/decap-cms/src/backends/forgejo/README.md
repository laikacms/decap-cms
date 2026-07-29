# Forgejo backend

An abstraction layer between the CMS and a [Forgejo](https://forgejo.org/) instance's REST API (e.g.
[Codeberg](https://codeberg.org/)). Forgejo is a Gitea fork with a compatible REST API, so this
backend shares most of its request plumbing with `backends/gitea`, but unlike the Gitea backend it
**does** support the editorial workflow, ported from upstream Decap CMS (`decaporg/decap-cms#7726`,
commit `1b52b90d3`).

## Code structure

`implementation.tsx` - `Forgejo` implementation of `CmsImplementation`, based on `API`. Supports
`publish_mode: editorial_workflow`.

`API.tsx` - A wrapper for the Forgejo (Gitea-compatible) REST API, including branch and pull request
endpoints used for the editorial workflow.

`AuthenticationPage.tsx` - A component that facilitates OAuth (PKCE) authentication against a
Forgejo instance.

`types.tsx` - Forgejo API response types.

Look at tests or types for more info.

## `backend:` config keys

| Key                | Type   | Default                                                       | Description                                                                                                                                                                                                                                                                                      |
| ------------------ | ------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo`             | string | none (required)                                               | The `owner/repo` slug of the Forgejo repository to edit. Required unless the backend is used in `proxied` mode; the constructor throws `'The Forgejo backend needs a "repo" in the backend configuration.'` when missing.                                                                        |
| `api_root`         | string | `'https://codeberg.org/api/v1'` (only applied when `proxied`) | Base URL for the Forgejo REST API (e.g. `https://codeberg.org/api/v1`). Forgejo has no single canonical instance, so when _not_ `proxied` this is required and the constructor throws when it's missing; in `proxied` mode a missing value silently falls back to `https://codeberg.org/api/v1`. |
| `branch`           | string | `'main'`                                                      | The branch to read from and write to. Whitespace is trimmed; falls back to `'main'` when unset or blank.                                                                                                                                                                                         |
| `base_url`         | string | derived from `api_root`                                       | Base URL of the Forgejo instance used for the OAuth (PKCE) login flow. Derived by stripping the trailing `/api/v<n>` segment from `api_root` when not set explicitly.                                                                                                                            |
| `app_id`           | string | `''`                                                          | OAuth application (client) ID used for the PKCE login flow.                                                                                                                                                                                                                                      |
| `cms_label_prefix` | string | `''`                                                          | Prefix applied to the CMS workflow status labels (`draft` / `pending_review` / `pending_publish`) created on pull requests, in case the label namespace collides with other repo labels.                                                                                                         |

## Other config keys

| Key            | Type   | Default | Description                                                                                                                                            |
| -------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `media_folder` | string | `''`    | Read directly off the top-level CMS config (not the `backend:` block) and stored on the implementation for media handling, same as other Git backends. |

## Editorial workflow

Setting `publish_mode: editorial_workflow` with `name: forgejo` enables the workflow: entries are
written to a `cms/<contentKey>` branch and a pull request against `branch` is opened. Workflow
status (`draft`, `pending_review`, `pending_publish`) is tracked via a CMS status label on the pull
request (`getOrCreateLabel` / `setPullRequestStatus`), the same mechanism the `github` backend uses.
Publishing merges and deletes the branch; deleting an unpublished entry closes the PR (if any) and
deletes the branch.

This port intentionally does **not** include upstream's "Open Authoring" (fork-based) support — that
is a separate, larger feature that can be layered on top of this backend later if needed.

## Notes

- Authentication uses the PKCE OAuth flow (`login/oauth/authorize` / `login/oauth/access_token`
  against `base_url`), not a personal access token flow.

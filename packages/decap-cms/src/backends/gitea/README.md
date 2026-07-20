# Gitea backend

An abstraction layer between the CMS and a [Gitea](https://gitea.io/) instance's REST API.

## Code structure

`implementation.tsx` - `Gitea` implementation of `CmsImplementation`, based on `API`. Does not
support the editorial workflow (constructor throws if `useWorkflow` is set).

`API.tsx` - A wrapper for the Gitea REST API.

`AuthenticationPage.tsx` - A component that facilitates OAuth (PKCE) authentication against a Gitea
instance.

`types.tsx` - Gitea API response types.

Look at tests or types for more info.

## `backend:` config keys

| Key        | Type   | Default                         | Description                                                                                                                                                                                                                                               |
| ---------- | ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo`     | string | none (required)                 | The `owner/repo` slug of the Gitea repository to edit. Required unless the backend is used in `proxied` mode (e.g. local backend / test backend); the constructor throws `'The Gitea backend needs a "repo" in the backend configuration.'` when missing. |
| `branch`   | string | `'master'`                      | The branch to read from and write to. Whitespace is trimmed; falls back to `'master'` when unset or blank.                                                                                                                                                |
| `api_root` | string | `'https://try.gitea.io/api/v1'` | Base URL for the Gitea REST API. Override for self-hosted Gitea instances.                                                                                                                                                                                |
| `base_url` | string | `'https://try.gitea.io'`        | Base URL of the Gitea instance used for the OAuth (PKCE) login flow (`AuthenticationPage.tsx`). Override for self-hosted Gitea instances alongside `api_root`.                                                                                            |
| `app_id`   | string | `''`                            | OAuth application (client) ID used for the PKCE login flow.                                                                                                                                                                                               |

## Other config keys

| Key            | Type   | Default | Description                                                                                                                                            |
| -------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `media_folder` | string | `''`    | Read directly off the top-level CMS config (not the `backend:` block) and stored on the implementation for media handling, same as other Git backends. |

## Notes

- The Gitea backend does not support the
  [editorial workflow](https://www.decapcms.org/docs/beta-features/#gitlab-and-bitbucket-editorial-workflow-support).
  Setting `publish_mode: editorial_workflow` with `name: gitea` throws
  `'The Gitea backend does not support editorial workflow.'` at initialization.
- Authentication uses the PKCE OAuth flow (`login/oauth/authorize` / `login/oauth/access_token`
  against `base_url`), not a personal access token flow.

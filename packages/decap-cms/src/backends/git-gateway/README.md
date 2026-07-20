# Git Gateway backend

An abstraction layer between the CMS and
[Netlify Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/), which proxies GitHub,
GitLab, or Bitbucket requests through Netlify Identity so editors never need their own git host
credentials.

## Code structure

`implementation.tsx` - `Implementation` that wraps one of `GitHubAPI`/`GitLabAPI`/the shared
Bitbucket `API`, authenticating via Netlify Identity (or PKCE) and detecting which underlying git
host to proxy to.

`GitHubAPI.tsx` / `GitLabAPI.ts` - Thin subclasses of the GitHub/GitLab `API` classes that rewrite
request URLs to go through the Git Gateway proxy instead of hitting the git host directly.

`GoTrue.ts` - A minimal Netlify Identity (GoTrue) client used when the `netlify-identity-widget`
script isn't present on the page.

`netlify-lfs-client.tsx` - A client for fetching Git LFS pointer file contents from Netlify Large
Media.

Look at tests or types for more info.

## `backend:` config keys

| Key                | Type    | Default                                                | Description                                                                                                                                                                                                                                                    |
| ------------------ | ------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity_url`     | string  | `/.netlify/identity`                                   | Endpoint used for the Netlify Identity (GoTrue) client when the `netlify-identity-widget` script isn't loaded on the page.                                                                                                                                     |
| `gateway_url`      | string  | `/.netlify/git`                                        | Base endpoint for the Git Gateway proxy. Also used to auto-detect the underlying git host: if the URL ends in `/github`, `/gitlab`, or `/bitbucket`, that suffix is stripped and used as the backend type (see [Backend detection](#backend-detection) below). |
| `large_media_url`  | string  | `/.netlify/large-media`                                | Endpoint for the Netlify Large Media (Git LFS) proxy, used to resolve and download large-media asset URLs.                                                                                                                                                     |
| `status_endpoint`  | string  | `https://www.netlifystatus.com/api/v2/components.json` | Endpoint polled for Git Gateway operational status, shown in the CMS status indicator.                                                                                                                                                                         |
| `auth_type`        | string  | `'netlify'`                                            | Authentication flow. Set to `'pkce'` to use `PKCEAuthenticationPage` (OAuth PKCE flow) instead of the default Netlify Identity widget login.                                                                                                                   |
| `branch`           | string  | `'master'`                                             | Branch the backend reads/writes against. Passed straight through to the underlying GitHub/GitLab/Bitbucket API config.                                                                                                                                         |
| `squash_merges`    | boolean | `false`                                                | Passed through to the underlying API config; squashes commits when merging editorial workflow changes (GitHub/GitLab).                                                                                                                                         |
| `cms_label_prefix` | string  | `''`                                                   | Passed through to the underlying API config; prefix added to the labels/statuses the CMS uses to track editorial workflow state.                                                                                                                               |

`identity_url`, `gateway_url`, and `large_media_url` are also resolved through a local-dev helper:
when running on `localhost`/`127.0.0.1`/`0.0.0.0` and a `netlifySiteURL` has previously been stored
in `localStorage` (set during the Netlify Identity login flow), any endpoint starting with
`/.netlify/` is rewritten to `${netlifySiteURL}${endpoint}` so local development can reach the real
hosted proxy. Absolute URLs (or endpoints not under `/.netlify/`) are left untouched.

## Backend detection

Git Gateway proxies one underlying git host (GitHub, GitLab, or Bitbucket) per site, and the backend
needs to know which one to pick the right `API`/`Backend` implementation:

1. **From `gateway_url`:** if the (possibly overridden) `gateway_url` ends in `/github`, `/gitlab`,
   or `/bitbucket` (optionally with a trailing slash), that suffix determines the backend type
   immediately, and the suffix is stripped from the URL used for subsequent requests.
2. **From the `/settings` endpoint:** if `gateway_url` has no such suffix, the backend type is left
   unresolved until `authenticate()` runs, at which point it fetches `${gatewayUrl}/settings` and
   reads the `github_enabled` / `gitlab_enabled` / `bitbucket_enabled` flags from the response
   (checked in that order), along with an optional `roles` array used later to gate access by
   Identity role.

If neither path yields a backend type, no `api`/`backend` instance is constructed and subsequent
operations will fail against a `null` backend.

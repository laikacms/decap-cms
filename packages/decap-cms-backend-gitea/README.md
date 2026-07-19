# Gitea backend

An abstraction layer between the CMS and the [Gitea](https://gitea.io/) REST API.

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`API` - A wrapper for the Gitea REST API.

`AuthenticationPage` - facilitates authentication against a Gitea instance.

Look at tests or types for more info.

## Config

```yaml
backend:
  name: gitea
  repo: owner/repo
  branch: main # optional, default: master
  api_root: https://try.gitea.io/api/v1 # optional, default: https://try.gitea.io/api/v1

media_folder: static/images
```

## `backend:` config keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `repo` | string | none (required) | The `owner/repo` slug of the Gitea repository the CMS reads/writes. Required unless the backend is used in `proxied` mode; the implementation throws `'The Gitea backend needs a "repo" in the backend configuration.'` if it is missing. |
| `branch` | string | `'master'` | The branch the CMS reads content from and commits to. |
| `api_root` | string | `https://try.gitea.io/api/v1` | Base URL used to build the Gitea REST API endpoint. Override when pointing at a self-hosted Gitea instance instead of the public `try.gitea.io` service. |

## Other config keys

| Key | Type | Description |
|-----|------|-------------|
| `media_folder` | string | Top-level config key (not under `backend:`) that sets the folder used for uploaded media assets, same as with every other backend. |

## Editorial workflow limitation

**The Gitea backend does not support the editorial workflow.** Unlike the GitHub, GitLab, Bitbucket and Azure backends, `Gitea` does not implement pull-request-based draft/review/publish states. If the CMS is configured with:

```yaml
publish_mode: editorial_workflow
```

the constructor throws at startup:

```
The Gitea backend does not support editorial workflow.
```

There is no partial or degraded support — attempting to use `editorial_workflow` with `backend: { name: gitea }` fails immediately rather than silently falling back to simple/direct publishing. Do not set `publish_mode: editorial_workflow` when using this backend.

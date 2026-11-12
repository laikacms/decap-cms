# Decap CMS: Turbo GitHub Backend

`turbo-github` connects Decap CMS to [Decap Turbo](https://decapcms.org/docs/turbo-overview/).
Content stays in your GitHub repository and every save is a commit, as with the `github` backend,
but editors sign in with a Turbo account instead of a GitHub account, and GitHub is reached through
Turbo's server-side proxy, which also caches the repository's content.

It extends `GitHubBackend` from [`backends/github`](../github). Anything not overridden here,
including branching and the pull-request-based editorial workflow, behaves as it does there. The
GitLab twin is [`backends/turbo-gitlab`](../turbo-gitlab); code the two share lives in
[`lib/turbo`](../../lib/turbo) (`decap-cms/lib/turbo`). Ported from upstream Decap CMS's
`decap-cms-backend-turbo-github`.

Product documentation: [overview](https://decapcms.org/docs/turbo-overview/),
[getting started](https://decapcms.org/docs/turbo-getting-started/),
[connecting a site](https://decapcms.org/docs/turbo-connecting-a-site/),
[roles and members](https://decapcms.org/docs/turbo-roles-and-members/),
[CLI and agents](https://decapcms.org/docs/turbo-cli-and-agents/).

## Configuration

The backend is registered by the default app (`registerExtensions` in `src/app/extensions.ts`) and
importable as `decap-cms/backends/turbo-github`.
[Create a site](https://decapcms.org/docs/turbo-getting-started/) in Turbo, then:

```yaml
backend:
  name: turbo-github
  turbo_site_id: your-site-id
```

`turbo_site_id` is the only required key. Before the backend is constructed, its static
`preloadConfig` hook fetches the rest from Turbo's `config` endpoint (Supabase project, anon key,
`base_url`, `api_root`, `repo` and the default `branch`) and merges it into `backend`. Values in
`config.yml` win, with one exception: `repo` always comes from the site in Turbo, because the proxy
checks permissions against it.

| Optional key    |                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `branch`        | Branch to edit. Defaults to the site's branch in Turbo. Set it to let one site back several deploys of the same repo.                           |
| `deploy_status` | `false` turns [deploy status](#deploy-status) off; an object with `notifications: false` or `page: false` turns one surface off. On by default. |
| `editor_bridge` | `true` turns on the experimental [editor bridge](#editor-bridge). Off by default.                                                               |

`use_graphql: true` is not supported and throws in the constructor: the GraphQL client builds its
own transport, which would skip the per-site scoping (`x-site-id` header and `site_id` parameter)
the proxy relies on. `open_authoring: true` throws too: Turbo commits as the organization's GitHub
App, which cannot fork or commit to an editor's own repository.

Not ported to this repo: upstream's S3 media library.

### Escape hatches

For running against a self-hosted control plane or working offline. The hosted product never needs
them.

| Key                                    |                                                                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turbo_config_url`                     | Config endpoint to fetch from, instead of `https://sb.decapcms.org/functions/v1/config`.                                                                                                                                                                   |
| `turbo_admin_url`                      | Turbo app that serves the login popup. Default `https://turbo.decapcms.org`.                                                                                                                                                                               |
| `supabase_app_id`, `supabase_anon_key` | Supabase project ref and anon key. The ref builds the auth and content cache URLs (`https://<ref>.supabase.co`). Setting both skips the fetch entirely, so `base_url`, `api_root` and `repo` must then be set too. Setting `supabase_app_id` alone throws. |
| `base_url`                             | Supabase project URL, for the `permissions` and `telemetry` functions, deploy status and the editor bridge.                                                                                                                                                |
| `api_root`                             | The `gh` proxy function, `<base_url>/functions/v1/gh`.                                                                                                                                                                                                     |

## How it works

### Login

"Login with Turbo" opens a popup on `turbo_admin_url`. The Turbo app sends the resulting Supabase
session back with `postMessage`, and `lib/turbo/AuthenticationPage.tsx` accepts it only when
`event.origin` equals the origin of `turbo_admin_url`. That check is the security boundary of the
flow and must never be relaxed. Links from the Turbo profile page carry a one-time code in the URL
hash instead, which is redeemed for the session with a POST to the Turbo app's `/auth/exchange`.

A session Turbo minted for this CMS alone is revoked server-side on logout. An older session shared
with the Turbo dashboard is left alone, so logging out of one CMS does not sign the user out of
Turbo.

### Requests and token refresh

The Supabase access token is sent as a Bearer token to the `gh` proxy, which calls GitHub with the
organization's GitHub App installation token. The CMS never holds a GitHub token.

The access token is refreshed before it expires, with retries for transient failures. Supabase
refresh tokens are single-use, so refreshes take a lock shared by every tab on the origin, and a tab
adopts a session another tab already rotated. A terminal refresh failure, or a 401 from the proxy
that one forced refresh cannot fix, ends the session with "Session expired. Please log in again." A
403 because the user is not a member of the site fails the login, or ends the session if it arrives
later.

### Content cache

Turbo's server owns the cache. For each folder or files collection the backend calls
`_content/sync`, which brings the cache up to the branch's current head, and reads the entries from
`public.data` through PostgREST. The browser has read access only. Locale files of `multiple_files`
i18n collections are synced in the background. Opening a single entry checks the cached row with
`_content/entry` and reads from GitHub when it is stale.

Saves go through `_content/commit`: one request that commits and updates the cache. Renames, saves
to an entry already in editorial review, open authoring, and requests the endpoint refuses with 400,
404 or 413 fall back to the inherited REST sequence.

### Permissions

After login the backend fetches the user's per-collection permissions from the `permissions`
function and attaches them to the user as `permissions.collections` (`edit`, `view` or `none`). Core
drops `none` collections and turns off create, delete and publish on `view` ones, for any backend
whose user carries that field; the scope-based `view_scopes`/`edit_scopes` checks still apply on
top. This is a UI convenience; the proxy enforces permissions on every request.

A session that ends for good mid-use (a revoked membership, a refresh token GoTrue refuses) is
reported to core through `onSessionInvalid`: the editor is logged out once, with the reason on the
login page, instead of every later request failing on its own.

### Commit attribution

Commits are authored by the Turbo GitHub App. The proxy adds the editor in a `Co-authored-by`
trailer, derived from the session rather than from anything the browser sends.

### Telemetry

The backend sends `cms_session_started` (on every login and session restore, no properties) and
`cms_entry_saved` (after each save: collection, slug, path, branch, whether it was an editorial
workflow draft, save duration, proxied request count, git-host time from `Server-Timing`, file count
and payload bytes) to Turbo's `telemetry` function, with the editor's access token and the site id.
Nothing is sent without a session. The call is not awaited and swallows its own errors, so it cannot
affect editing. Editors opt out of analytics on their Turbo profile, owners for the whole
organization in its settings. Opting out is applied server-side; the save event that feeds the
organization's Activity log is still recorded.

### Deploy status

The backend implements core's optional deploy-status methods (`src/lib/backend/deployStatus.ts`),
which light up the "Saved · Publishing…" toast, the "your change is live" notification, the header's
Deploys item and the `/deploys` page. All of it reads Turbo's `site_deployments` and `site_commits`
tables through PostgREST (`<base_url>/rest/v1/...`) with the editor's access token and the site id;
nothing is read without a session.

- **After a save** to the site's branch, the commit sha goes into a per-site ledger in
  `localStorage` (`decap-turbo:deploys:<site id>`), so a reload resumes it. While the ledger is
  non-empty the backend polls `site_deployments` for the site's branch, newest 20 rows updated since
  the oldest pending save: every 5s for the first minute, every 15s to three minutes, then every
  30s. A success whose commit is not the saved one is checked with GitHub's compare API (through the
  proxy) to see whether it contains the save. A save resolves when a deploy containing it succeeds;
  a failure is reported but kept, so a fixed build still announces the change live. Polling stops
  when the ledger empties, after two minutes with no deploy row at all (no deploy hook reports for
  this site), after five consecutive failed reads, and when nobody is subscribed. A save is
  forgotten 20 minutes after it was made. Editorial-workflow saves land on a `cms/...` branch and
  are not watched.
- **On login** core makes one read of the newest 200 deploys (all branches) and commits, for the
  header item.
- **The Deploys page** reads the same again when opened, on Refresh, and every 10s while it is open
  in a visible tab.

The commit request also carries the entry's title and path (`entry_label`, `entry_path`), so the
page can name the entry a deploy carried for every editor.

### Editor bridge

With `editor_bridge: true`, the entry open in the CMS is synced to Turbo every few seconds, so an
agent using the `decap mcp` command of the Decap CLI can propose field changes. They appear
highlighted in the editor and are saved only when the editor saves. The bridge also adds an "Ask
Claude" action beside each field (through core's experimental `CMS.registerFieldAction`) and an
"Agent bridge on" badge, whose × turns it off for the tab. It is experimental and may change.

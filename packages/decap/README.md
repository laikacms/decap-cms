# @decap/cli

The Decap command line, installed as the `decap` command. It runs the local proxy server for editing
a site on your own machine, manages [Decap Turbo](https://turbo.decapcms.org), and connects AI
agents to Turbo over MCP. Turbo commands go through the Turbo API with a personal access token, so
they can never do more than you can in the dashboard.

> **Experimental.** `decap dev` is the replacement for `npx decap-server`. Everything else (`login`,
> `whoami`, `logout`, `mcp` and the Turbo commands) talks to the Decap Turbo API, which is in
> preview: commands, flags and output may change between releases without a major version bump. Pin
> an exact version in scripts and CI.

This is the v4 port of upstream's `packages/decap` (published there as `@decap/cli`). It needs Node
24, like the rest of this repository. Published publicly as `@decap/cli`, as upstream is.

## Local development: `decap dev`

Runs the proxy server for Decap's `proxy` backend, so the CMS reads and writes the repository on
disk.

```sh
decap dev                 # serve the current directory on port 8081
decap dev --mode git      # commit changes, with editorial workflow support
decap dev --port 8082 --dir ../my-site
```

Point the CMS at it:

```yaml
local_backend: true
```

or, explicitly:

```yaml
backend:
  name: proxy
  proxy_url: http://localhost:8081/api/v1
```

Each flag overrides an environment variable, also read from a `.env` file in the working directory:
`--port` (`PORT`, default 8081; 0 picks a free port), `--host` (`BIND_HOST`, default this machine
only; the server has no authentication, so only pass `0.0.0.0` or another network address on a
network you trust, e.g. inside a container), `--mode` (`MODE`: `fs` or `git`, default `fs`), `--dir`
(`GIT_REPO_DIRECTORY`, default the current directory), `--origin` (`ORIGIN`, the CMS origin allowed
to call the server, default localhost) and `--log-level` (`LOG_LEVEL`: `error`, `warn`, `info`,
`http`, `verbose`, `debug` or `silly`, default `info`; `debug` logs every request).

The server is not part of this package: it is v4's own dev server, `decap-cms/dev-server`
(`packages/decap-cms/src/dev-server/`), which `decap dev` starts through its `runDevServer` export.
Upstream's `@decap/cli/dev` programmatic API (Express middlewares) has no equivalent here; v4's
server does not use Express.

## Sign in

```sh
decap login          # opens the browser; approve, and a token is stored
decap login --admin  # also request admin scope (manage sites and members)
decap whoami
decap logout         # revokes the token and forgets it
```

The token is stored in `~/.config/decap/credentials.json` (mode 0600; `$XDG_CONFIG_HOME` is
honoured). In CI, set `DECAP_TOKEN` to a token created under **API tokens** in the dashboard
instead. Set `DECAP_NO_BROWSER` to have `login` skip launching a browser, for a machine with none to
open; it still prints the approval URL to copy elsewhere.

## Manage Turbo

Every Turbo API operation is a command. `decap --help` lists them; `decap <command> --help` shows
its flags.

```sh
decap orgs list
decap sites list --org <org-id>
decap sites create --org <org-id> --name "Marketing site" --repo acme/marketing
decap sites update --site <site-id> --branch develop
decap cache clear --site <site-id>
decap deploys list --site <site-id> --limit 5
decap members invite --org <org-id> --email someone@example.com
decap members set-role --org <org-id> --member someone@example.com --role owner
decap site-members add --site <site-id> --member someone@example.com
```

Members can be named by email or user id. Add `--json` for machine-readable output. Commands that
change something need a token with admin scope (`decap login --admin`) and an organization owner
behind it, the same as in the dashboard.

## Edit the open entry

When you have an entry open in a Turbo-backed CMS, an agent (or you) can change its fields there
without saving: the change appears highlighted in your editor, for you to review and save.

```sh
decap editor list                                  # entries you have open, with their fields and values
decap editor set --session <id> --fields '{"title": "New title", "seo.description": "..."}'
decap editor open --site <site-id> --collection posts --slug hello   # the CMS link for an entry
```

The editor bridge is experimental and off by default: turn it on for a site with
`editor_bridge: true` under `backend` in config.yml. These commands only call the Turbo API; the CMS
side of the bridge (upstream's editor API and Turbo backend) is not ported to v4 yet.

## Use it from an AI agent

`decap mcp` is a local MCP server. Sign in once with `login`, then add it to your agent.

**Claude Code**

```sh
claude mcp add decap -- npx -y @decap/cli mcp
```

**Claude Desktop, Cursor, and other clients that take a JSON config**

```json
{
  "mcpServers": {
    "decap": { "command": "npx", "args": ["-y", "@decap/cli", "mcp"] }
  }
}
```

## Developing

The API contract (operations, input schemas, MCP tool metadata) lives in `src/turbo-api/`. Upstream
publishes it as its own package, `decap-turbo-api`, for the Turbo server to pin; in v4 the CLI is
its only consumer, so it is part of this package.

```sh
pnpm install                          # from the repository root
pnpm --filter @decap/cli build        # dist/decap.js
pnpm --filter @decap/cli test
pnpm --filter @decap/cli typecheck
pnpm --filter @decap/cli lint
```

How `decap-cms/dev-server` resolves: the published `decap-cms` exports it from `dist/`, which is
emitted for bundlers (extensionless imports) and does not load in plain Node. This package therefore
resolves it to the decap-cms **source** everywhere, so none of the commands above needs decap-cms to
be built first:

- `tsconfig.json` maps `decap-cms/dev-server` (and, for the decap-cms files only, their `@/` alias)
  into `../decap-cms/src`, so `typecheck` checks the CLI against the current dev-server source.
- `vitest.config.ts` has the same aliases, so the `decap dev` specs run the real server.
- `scripts/build.mjs` bundles with esbuild: the contract, the dev server and the few decap-cms
  helpers it uses go into `dist/`, and only the packages in `dependencies` stay external. That is
  why `simple-git` and `dotenv` (imported by the dev server) are dependencies here.

`decap-cms` is a `workspace:*` dev dependency: it is bundled, not installed, but the entry keeps
pnpm's build order right.

Against a local Turbo (the Turbo app on port 4321):

```sh
node dist/decap.js login --api-url http://localhost:4321
node dist/decap.js whoami
```

To try changes with an agent, point it at the local build (the stored credentials remember the API
URL):

```sh
claude mcp add decap-local --scope user -- node /absolute/path/to/decap-cms/packages/decap/dist/decap.js mcp
```

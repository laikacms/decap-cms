# CONTRIBUTING

Contributions are always welcome, no matter how large or small. Before contributing, please read the
[code of conduct](CODE_OF_CONDUCT.md).

This repository is a pnpm workspace with a single self-named package: the published
`@laikacms/decap-cms` fork of Decap CMS lives in `packages/decap-cms/`, where the former monorepo
packages live under `src/`. The root only carries repo-wide tooling and delegates every script into
the package, so all commands below run from the repo root. Background on the restructure and the
workspace layout is in [RESTRUCTURE.md](RESTRUCTURE.md).

## Setup

> Install [Node.js](https://nodejs.org/) 20 or later. The repo uses pnpm 9 (see `packageManager` in
> `package.json`; `corepack enable` sets it up).

```sh
git clone https://github.com/laikacms/decap-cms
cd decap-cms
pnpm install
```

## Available scripts

| Command                                      | What it does                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                             | TypeScript check across src, playwright, storybook, and node configs (4 `tsc` invocations) |
| `pnpm lint` / `pnpm format`                  | ESLint / dprint                                                                            |
| `pnpm test`                                  | Vitest, single run (`pnpm test:watch` for watch mode)                                      |
| `pnpm test:ci`                               | lint + typecheck + unit tests; run this before opening a PR                                |
| `pnpm test:e2e`                              | Playwright end-to-end tests (builds and serves the demo itself)                            |
| `pnpm build`                                 | Compiles the publishable package to `packages/decap-cms/dist/`                             |
| `pnpm build:dev-test && pnpm serve:dev-test` | Demo app on http://localhost:5174                                                          |

The demo app uses the in-memory `test-repo` backend with fixtures from
`packages/decap-cms/dev-test/repo-fixtures.js` and the config in
`packages/decap-cms/dev-test/config.yml`, so you can exercise most of the CMS without any Git
provider.

`build:dev-test` builds every `dev-test/dist/*.js` bundle the served pages load (`decap-cms.js`,
`laika-cms.js`, `laika-cms-bare.js`) — running only `pnpm build:demo` builds the classic bundle and
leaves the Laika UI pages (e.g. `/laika.html`) 404ing on the missing `laika-cms.js`.

To run a single test file, pass a path filter to Vitest (from `packages/decap-cms/`):

```sh
cd packages/decap-cms
pnpm test src/core/lib/__tests__/registry.spec.ts
pnpm test -- -t "name pattern"
```

## Pull requests

1. Fork the repo and create a branch from `v4.beta`, the active development trunk.
2. If you have added code that should be tested, add tests. Tests are colocated in `__tests__/`
   directories as `*.spec.tsx` / `*.test.ts`.
3. Follow [Conventional Commits](https://www.conventionalcommits.org/); commitlint runs on the
   `commit-msg` hook. House style is `type(scope): subject (DCMS-nnn)` with an area slug scope such
   as `core`, `app`, or `widget-richtext`.
4. Run `pnpm test:ci` and make sure it passes.
5. A maintainer reviews and merges; PRs should be rebased on `v4.beta` before merge.

## Debugging against a real backend

`packages/decap-cms/dev-test/config.yml` drives the demo. To test a real Git backend, point the
`backend` section at your provider and repository:

```yaml
backend:
  name: github
  repo: owner-name/repo-name
```

Then rebuild the demo (`pnpm build:demo`) and reload http://localhost:5174.

## Releasing

There is no CI or publish automation on `v4.beta` yet (`.github/workflows/` is empty on this
branch) — releasing is a manual process for now:

1. Bump `version` in `packages/decap-cms/package.json` and commit.
2. Run `pnpm test:ci` and make sure it passes.
3. Tag the commit `v<version>` and push the tag.
4. Build and publish to npm manually (e.g. `pnpm build` then `npm publish` from
   `packages/decap-cms`), and write the GitHub release notes by hand.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT license](LICENSE).

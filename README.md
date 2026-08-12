![Decap CMS](/.github/decap.svg)

# laikacms/decap-cms

[![npm version](https://img.shields.io/npm/v/@laikacms/decap-cms.svg?style=flat)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![npm last update](https://img.shields.io/npm/last-update/@laikacms/decap-cms)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/laikacms/decap-cms/blob/main/LICENSE)
[![core size](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Flaikacms%2Fdecap-cms%2Fmain%2F.github%2Fbundle-size.json&query=%24.entries%5B%27.%2Fapp%2Fbare%27%5D.pretty&label=core%20size&color=informational)](packages/decap-cms/scripts/analyze.mjs)
[![last commit](https://img.shields.io/github/last-commit/laikacms/decap-cms?branch=main)](https://github.com/laikacms/decap-cms/commits/main)
[![commit activity](https://img.shields.io/github/commit-activity/m/laikacms/decap-cms)](https://github.com/laikacms/decap-cms/commits)
[![dependencies](https://img.shields.io/librariesio/github/laikacms/decap-cms?label=dependencies)](https://libraries.io/github/laikacms/decap-cms)

This repository is a pnpm workspace. The actual CMS - **`@laikacms/decap-cms`**, a single-package
fork of [Decap CMS](https://decapcms.org/) - lives in
[`packages/decap-cms`](packages/decap-cms/README.md), which has the full README covering what the
fork is, how it differs from upstream, and how to use it.

## Install

```sh
npm install @laikacms/decap-cms
```

The root export bootstraps the classic app. Individual parts (backends, widgets, the core engine, UI
primitives, plus the tree-shakeable `@laikacms/decap-cms/app/bare` and `.../laika-app/bare` entries)
are importable through subpath exports so you can assemble your own build. See the
[package README](packages/decap-cms/README.md) for usage, visual editing, and the config JSON
Schema.

## Documentation

- [Package README](packages/decap-cms/README.md) - installation, usage, visual editing, and the
  config JSON Schema
- [Editor guide](docs/editor-guide.md) - for content editors: writing entries, the widget set, the
  editorial workflow, and the media library
- [Community widgets](docs/community-widgets.md) - curated list of third-party `registerWidget`
  packages, and how to list your own
- [Decap CMS documentation](https://www.decapcms.org/docs/intro/) - configuration, content modeling,
  and backend setup; applies to this fork unless noted below
- [Breaking changes in v4.beta](docs/contributing/decisions/breaking-changes-v4-beta.md) - how this
  fork differs from upstream
- [Laika backend notes](packages/decap-cms/src/backends/laika/README.md) - required reading if you
  use the `laika` backend
- [Contributing docs](docs/contributing/index.md) - design decisions and learnings behind the repo
- [CONTRIBUTING.md](CONTRIBUTING.md) - development guide and release process
- [Releases / change log](https://github.com/laikacms/decap-cms/releases) - every version,
  documented

## Repository layout

```
packages/
  decap-cms/           the published @laikacms/decap-cms package (source, tests, demo, build)
  decap-cms-lib-pat/   scoped Personal Access Token minting/hashing/verification for Decap CMS servers
docs/
  contributing/  design decisions and learnings (see docs/contributing/index.md)
  core/          core-engine notes
  editor-guide.md  end-user guide for content editors
  community-widgets.md  curated list of third-party registerWidget packages
```

The workspace shape lets sibling packages (plugins, tooling, server pieces) live under `packages/`
alongside the main CMS package without another restructure, mirroring the layout of the
`laikacms/laikacms` repo. The reasoning is documented in
[restructure.md](docs/contributing/decisions/restructure.md).

## Working in this repo

Everything runs from the root through pnpm:

```sh
pnpm install
pnpm test:ci      # lint + typecheck + unit tests, per package
pnpm build        # builds every package
pnpm build:dev-test && pnpm serve:dev-test   # demo app on http://localhost:5174, Laika UI on /laika.html
```

Repo-wide tooling (formatting via dprint, git hooks via husky, commit linting) lives at the root;
each package is otherwise self-contained (its own tsconfig, ESLint config, tests, and build). See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development guide.

## License

[MIT](LICENSE)

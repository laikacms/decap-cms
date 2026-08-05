![Decap CMS](/.github/decap.svg)

# laikacms/decap-cms

This repository is a pnpm workspace. The actual CMS - **`@laikacms/decap-cms`**, a single-package
fork of [Decap CMS](https://decapcms.org/) - lives in
[`packages/decap-cms`](packages/decap-cms/README.md), which has the full README covering what the
fork is, how it differs from upstream, and how to use it.

## Repository layout

```
packages/
  decap-cms/           the published @laikacms/decap-cms package (source, tests, demo, build)
  decap-cms-lib-pat/   scoped Personal Access Token minting/hashing/verification for Decap CMS servers
docs/                  repo-level design and verification docs
```

The workspace shape lets sibling packages (plugins, tooling, server pieces) live under `packages/`
alongside the main CMS package without another restructure, mirroring the layout of the
`laikacms/laikacms` repo. The reasoning is documented in [RESTRUCTURE.md](RESTRUCTURE.md).

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

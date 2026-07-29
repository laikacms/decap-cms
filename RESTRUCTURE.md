# Single-package restructure (`feat/single-package-restructure`)

This branch converts the Decap CMS v4.beta monorepo into a single published package —
**`@laikacms/decap-cms`** — that exposes every former workspace package through a subpath export.
The root export is the old `decap-cms-app` bootstrap (not a barrel re-export).

The goal is so a downstream consumer (e.g. `laikacms/laikacms`'s forthcoming `laika-cms-app`) can
do:

```ts
import { App } from '@laikacms/decap-cms/app';
import { DecapCmsCore, DecapCmsProvider } from '@laikacms/decap-cms/core';
import { DecapCmsWidgetString } from '@laikacms/decap-cms/widgets/string';
// ...etc — same shape as the old `decap-cms-app/src/extensions.ts`,
// minus the multi-package workspace.
```

and assemble its own `App` without taking on `@laikacms/decap-cms` as a barrel.

## Update (2026-07): workspace revival - `packages/decap-cms`

The repo is a pnpm workspace again, but with a very different shape than the pre-fork monorepo this
document describes flattening. Everything that used to sit at the repo root (source, tests, demo,
build and test configs, the publishable `package.json`) now lives in a single self-named package:

```
packages/
  decap-cms/    @laikacms/decap-cms - the whole former repo root
```

### Why

- **Room to grow without another restructure.** The flattening (below) was about publishing _one
  package_ instead of 38 - that decision stands. But a repo whose root _is_ the package can hold
  exactly one package forever. Sibling packages are coming (see the AI-native plan: MCP server, CLI,
  skills packaging), and adding them to a flat root would have meant doing this move later under
  pressure. The `packages/` folder exists so a second package is a `mkdir`, not a migration.
- **Same layout as `laikacms/laikacms`.** The sister repo is a pnpm workspace with self-named
  packages under `packages/` (`packages/laikacms`, `packages/decap`, ...). Contributors and agents
  move between the two repos; one mental model for both.
- **One package != one flat repo.** The "single package, many subpath exports" design is unchanged
  (see "What changed" below for the current count) - `@laikacms/decap-cms` is still the only
  published artifact, and nothing about its `exports` map, build, or consumer-facing shape moved.
  Only the _repo_ gained a level of indirection.

### Who owns what

- **Root** owns repo-wide concerns only: `pnpm-workspace.yaml` (workspace members + the dependency
  catalogs), formatting (`dprint.json`), git hooks (husky + commitlint), CI (`.github/`), and the
  repo docs. The root `package.json` is private and just delegates (`pnpm -r run ...` /
  `pnpm --filter @laikacms/decap-cms ...`), so every command still works from the repo root.
- **`packages/decap-cms`** is self-contained: its own `package.json`, `tsconfig*.json`,
  `eslint.config.mjs` (the layer-deps and prefer-alias rules are package-specific, so the config
  lives with the package), vitest + Playwright + Storybook setups, `dev-test/` demo, and `scripts/`.
  A future sibling package brings its own configs rather than inheriting these.
- The empty `packages: []` workaround (kept only so `catalog:` resolved) is gone; the catalogs now
  serve a real workspace member list.

Publishing: there is no CI or publish automation on `v4.beta` yet (`.github/workflows/` is empty
on this branch) — releasing is a manual process (see `CONTRIBUTING.md`'s "Releasing" section); the
`files` allowlist and `prepack` build are unchanged.

## What changed

| Before                                                                         | After                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/decap-cms-<name>/src/`                                               | `src/<name>/` (prefix `decap-cms-` stripped)                                                                                    |
| `packages/decap-server/src/`                                                   | `src/dev-server/`                                                                                                               |
| Per-package `package.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`       | Deleted — single root `package.json`                                                                                            |
| `pnpm-workspace.yaml` (workspace + catalogs)                                   | Kept; `packages: []` so the `catalog:` protocol still resolves (superseded: real workspace again, see the 2026-07 update above) |
| `lerna.json`                                                                   | Deleted                                                                                                                         |
| `turbo.json`                                                                   | Deleted (no per-pkg tasks to coordinate)                                                                                        |
| `tsconfig.build.json`                                                          | Deleted at first; later reintroduced to drive `pnpm build` (tsc + tsc-alias)                                                    |
| Cross-package imports `from 'decap-cms-core'`, `from 'decap-cms-lib-util/...'` | Rewritten to relative paths inside `src/`                                                                                       |

**362 imports across 185 files** were rewritten by `scripts/rewrite-imports.py`- style logic during
the restructure. Zero `from 'decap-cms-*'` strings remain inside `src/`.

The new `package.json#exports` map has **34 subpaths** (wildcard entries like `./widgets/*`,
`./backends/*`, `./entry-codecs/*`, and `./format-packs/*` count as one each; the explicit
`"./format-packs/mdx": null` block that excludes the not-yet-implemented mdx pack from the
`./format-packs/*` wildcard counts as its own subpath — see DCMS-1613). The root export `.`
points at `src/app/index.ts` (the old `decap-cms-app` bootstrap). This count drifts as subpaths are
added — it's pinned by `src/__tests__/exports-count.test.ts`, so if that test fails, update both the
test and this line together.

## What needs verification before merge

1. **`pnpm install`** at the repo root. The catalogs file is preserved so all `catalog:foo`
   references should resolve. Confirm no peer-dep warnings beyond the expected `react`, `react-dom`,
   `@emotion/react`, `@emotion/styled`.
2. **`pnpm typecheck`**. With cross-package imports now relative and one tsconfig covering
   everything, type errors caused by the move (extension mismatches, missing index files in
   formerly-empty packages, etc.) will surface here.
3. **`pnpm build`**
   (`rimraf dist && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json
   && pnpm copy:assets`
   — plain `tsc`, not tsup; there is no tsup dependency or config anywhere in this repo).
   `tsconfig.build.json` compiles the whole `src/` tree (`include: ["src/**/*"]`, `rootDir: src`,
   `outDir: dist`) file-by-file into `dist/`, mirroring the source layout 1:1 — it does not discover
   or bundle per-entry-point like tsup would. `tsc-alias` then rewrites the `@/*` path-alias imports
   tsc leaves untouched, and `copy:assets` copies non-TS static files (e.g.
   `widgets/code/data/languages.json`) that `tsc` doesn't emit. Because `tsc` happily compiles _any_
   `.ts`/`.tsx` under `src/` (not just `index.*`), a bad `exports` subpath does **not** fail the
   build. If a subpath points at a `dist/` file with no corresponding compiled `src/` file (typo'd
   name, deleted/renamed directory, wrong path), the build succeeds silently and the failure only
   shows up later, at runtime import resolution (`ERR_PACKAGE_PATH_NOT_EXPORTED` /
   module-not-found). `src/__tests__/exports-dist-targets.test.ts` pins this: after a real
   `pnpm build`, it asserts every `exports` subpath's target file(s) actually exist in `dist/`.
   (It's skipped on a clean checkout with no `dist/` yet, so it doesn't force a build into
   `pnpm test`/`test:ci` — run `pnpm build` first to exercise it.)
4. **`pnpm test`**. Vitest config will need its include patterns checked — old patterns globbed
   `packages/**/*.test.{ts,tsx}` which is gone.

## Stubs and empty entries

Five packages had no `src/` directory in the v4.beta state we forked from (the never-implemented
Lexical WYSIWYG stack — `lexical-core`, `lexical-format-*`, `widget-lexicaleditor` — plus the empty
`lib-domain`). These have since been deleted; revive from git history if needed.

## Known follow-ups

Not blocking the restructure, but they belong in the next pass:

- ~~Strip dead plumbing~~ — done. Removed `__mocks__/` (jest leftover), `functions/` (orphan Slack
  webhook, no netlify config), `codemods/`, and unused `img/` badges. `dev-test/` is kept — it's the
  live demo, served by the `dev`/`serve:dev-test` scripts. The broken `packages/decap-cms-locales`
  import in `cypress/utils/dismiss-local-backup.ts` now points at `src/locales`.
- ~~Remove `scripts/test-package-integrity.mjs`~~ — done (deleted).
- ~~vitest config references `packages/**`~~ — done; dead `decap-cms-*` aliases removed from
  `vitest.config.ts`.
- ~~ESLint config lints `packages/**`~~ — done; config repaired to read `src/**`, missing plugins
  added, import-x resolver wired up.
- Publish + CI workflows — still open. There is no CI or publish automation on `v4.beta` yet
  (`.github/workflows/` is empty on this branch); releasing is a manual process for now (see
  `CONTRIBUTING.md`). `origin/main` has its own `publish.yml`/`nodejs.yml`, but those haven't been
  ported to this branch's `src/` layout. The Cypress e2e job's old orchestration scripts
  (`test:e2e:run-ci`, `test:package-integrity`) are gone; rebuild it for the `src/` layout when e2e
  coverage and CI are wanted again.
- ~~Sort the deps~~ — the `dependencies` block is already alphabetised.
- ~~`overrides`/`resolutions` review~~ — done; removed the dead `clean-stack` pin (not in the
  dependency tree, and pnpm reads `pnpm.overrides`, not the npm/yarn fields anyway).
- ~~The lexical stubs~~ — deleted (see above).
- ~~Per-package `README.md` deletion orphaned 14 doc-gap issues~~ (#786, DCMS-605) — done; the
  per-directory READMEs were recreated at `packages/decap-cms/src/<name>/README.md` (e.g.
  `widgets/string`, `widgets/text`, `widgets/list`, `widgets/richtext`, `core`, `lib/auth`,
  `backends/git-gateway`, `backends/gitlab`, `backends/bitbucket`), and the tracker issue #786 is
  closed. `packages/decap-cms/src/ui/README.md` is the reference example of the per-directory
  README style.

## Why this shape

- **One package, many exports.** Consumers depend on one name (`@laikacms/decap-cms`) and pick the
  bits they want by subpath. Versioning is one cursor instead of 38.
- **Root export = `app`, not a barrel.** Importing `@laikacms/decap-cms` gives you the default
  bootstrap (`init({ config })`). Importing `@laikacms/decap-cms/core` gives you the raw building
  blocks, in the same shape the old `decap-cms-app/src/extensions.ts` consumed them.
- **Relative imports in `src/`.** No `tsconfig#paths` indirection, no self-references, no bundler
  magic — what you read is what runs. Required to keep this readable as a single tree.
- **Catalogs preserved.** The single biggest win of the workspace was the pnpm catalogs (~150 deps
  under one version cursor each). They were kept through the flattening (via an empty
  `packages: []`) and now serve the revived workspace (see the 2026-07 update above).

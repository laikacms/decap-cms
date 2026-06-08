# Single-package restructure (`feat/single-package-restructure`)

This branch converts the Decap CMS v4.beta monorepo into a single published
package — **`@laikacms/decap`** — that exposes every former workspace package
through a subpath export. The root export is the `decap-cms-app` bootstrap
(not a barrel re-export).

The goal is so a downstream consumer (e.g. `laikacms/laikacms`'s
forthcoming `laika-cms-app`) can do:

```ts
import { DecapCmsCore, DecapCmsProvider, App } from '@laikacms/decap/core';
import { widget as stringWidget } from '@laikacms/decap/widget-string';
// ...etc — same shape as the old `decap-cms-app/src/extensions.ts`,
// minus the multi-package workspace.
```

and assemble its own `App` without taking on `@laikacms/decap` as a barrel.

## What changed

| Before                                                                          | After                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `packages/decap-cms-<name>/src/`                                                | `src/<name>/` (prefix `decap-cms-` stripped)        |
| `packages/decap-server/src/`                                                    | `src/server/`                                       |
| Per-package `package.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`        | Deleted — single root `package.json`                |
| `pnpm-workspace.yaml` (workspace + catalogs)                                    | Kept; `packages: []` so the `catalog:` protocol still resolves |
| `lerna.json`                                                                    | Deleted                                             |
| `turbo.json`                                                                    | Deleted (no per-pkg tasks to coordinate)            |
| `tsconfig.build.json`                                                           | Deleted (one root `tsconfig.json` is enough)        |
| Cross-package imports `from 'decap-cms-core'`, `from 'decap-cms-lib-util/...'`  | Rewritten to relative paths inside `src/`           |

**362 imports across 185 files** were rewritten by `scripts/rewrite-imports.py`-
style logic during the restructure. Zero `from 'decap-cms-*'` strings remain
inside `src/`.

The new `package.json#exports` map has **38 subpaths**, one per `src/<name>/`
directory. The root export `.` points at `src/app/index.ts` (the
old `decap-cms-app` bootstrap).

## What needs verification before merge

1. **`pnpm install`** at the repo root. The catalogs file is preserved so all
   `catalog:foo` references should resolve. Confirm no peer-dep warnings beyond
   the expected `react`, `react-dom`, `@emotion/react`, `@emotion/styled`.
2. **`pnpm typecheck`**. With cross-package imports now relative and one
   tsconfig covering everything, type errors caused by the move (extension
   mismatches, missing index files in formerly-empty packages, etc.) will
   surface here.
3. **`pnpm build`** (tsup). Produces `dist/<name>/index.js` and
   `dist/<name>/index.d.ts` for each entry, matching the `exports` map. The
   tsup config auto-discovers entries from `src/<name>/index.{ts,tsx}` — if a
   subpath in `exports` has no corresponding `index.*`, the build fails on
   that entry. Fix is either to add the file or remove the subpath from
   `exports`.
4. **`pnpm test`**. Vitest config will need its include patterns checked — old
   patterns globbed `packages/**/*.test.{ts,tsx}` which is gone.

## Stubs and empty entries

Five packages had no `src/` directory in the v4.beta state we forked from:

- `lexical-core`, `lexical-format-contentful-rtf`, `lexical-format-html`,
  `lexical-format-markdown`, `lexical-format-portabletext` — the Lexical
  WYSIWYG stack was scaffolded but never implemented.
- `lib-domain` — empty.
- `widget-lexicaleditor` — also empty.

These are **not** in the `exports` map. If you want to revive any of them,
add the `src/<name>/index.ts`, restore the dependency in the root
`package.json`, and add the subpath to `exports`.

## Known follow-ups

Not blocking the restructure, but they belong in the next pass:

- **Strip cypress/dev-test plumbing**. `cypress/`, `dev-test/`, `__mocks__/`,
  `codemods/`, `functions/`, `img/`, `scripts/` were all aimed at the old
  workspace. Most can be deleted; the ones we want to keep (e.g. a demo for
  manual sanity testing) need to be re-pointed at the new src/ layout.
  (Partly done: the broken `packages/decap-cms-locales` import in
  `cypress/utils/dismiss-local-backup.ts` now points at `src/locales`.)
- ~~Remove `scripts/test-package-integrity.mjs`~~ — done (deleted).
- ~~vitest config references `packages/**`~~ — done; dead `decap-cms-*`
  aliases removed from `vitest.config.ts`.
- ~~ESLint config lints `packages/**`~~ — done; config repaired to read
  `src/**`, missing plugins added, import-x resolver wired up.
- **Publish workflow**. `.github/workflows/publish.yml` still calls `lerna`
  (`lerna ls`, `npm run lerna:publish`), but `lerna.json`, the `lerna`
  dependency, and the `lerna:publish` script are all gone. The single-package
  publish flow needs to be defined and the workflow rewritten.
- **Sort the deps**. The hoisted `dependencies` block was picked from the
  per-package lists with conflict-resolution favoring the catalog where one
  existed. The widget-markdown / widget-richtext conflicts (older
  `mdast-util-to-string`, `unified` 9 vs 11, etc.) were resolved in favor of
  the catalog. If those widgets break at runtime, pin the older versions
  inline (override the catalog) rather than splitting back into packages.
- **`overrides`/`resolutions` review**. Inherited the old `clean-stack` and
  `react-redux` resolutions; verify they're still load-bearing.
- **The lexical stubs** (above) — decide whether to delete them outright or
  finish implementing them.

## Why this shape

- **One package, many exports.** Consumers depend on one name (`@laikacms/decap`)
  and pick the bits they want by subpath. Versioning is one cursor instead of 38.
- **Root export = `app`, not a barrel.** Importing `@laikacms/decap` gives you
  the default bootstrap (`init({ config })`). Importing
  `@laikacms/decap/core` gives you the raw building blocks, in the same
  shape the old `decap-cms-app/src/extensions.ts` consumed them.
- **Relative imports in `src/`.** No `tsconfig#paths` indirection, no
  self-references, no bundler magic — what you read is what runs. Required to
  keep this readable as a single tree.
- **Catalogs preserved.** The single biggest win of the workspace was the
  pnpm catalogs (~150 deps under one version cursor each). Keeping the
  catalog file with an empty `packages: []` lets us keep that win in a
  single-package layout.

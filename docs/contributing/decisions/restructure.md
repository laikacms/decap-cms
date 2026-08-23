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
  (see "What changed" below for the current count) - `@laikacms/decap-cms` is still the CMS itself,
  and nothing about its `exports` map, build, or consumer-facing shape moved. Only the _repo_ gained
  a level of indirection. (It was also the only published artifact at the time; see the 2026-08
  update below.)

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

Publishing: there is no CI or publish automation on `v4.beta` yet (`.github/workflows/` is empty on
this branch) — releasing is a manual process (see `CONTRIBUTING.md`'s "Releasing" section); the
`files` allowlist and `prepack` build are unchanged.

## Update (2026-08): `extensions/` and the end of one-artifact (DCMS-1971)

The repo now publishes six packages, not one:

```
packages/
  decap-cms/              @laikacms/decap-cms - the CMS
  decap-cms-lib-pat/      decap-cms-lib-pat - scoped PAT minting/verification
extensions/
  widgets/
    map/                  @laikacms/decap-cms-widget-map
    lucide-icon/          @laikacms/decap-cms-widget-lucide-icon
    radix-icon/           @laikacms/decap-cms-widget-radix-icon
    aichat/               @laikacms/decap-cms-widget-aichat
  editor/
    ai-translate/         @laikacms/decap-cms-ai-translate
  llm/
    dulla/                @laikacms/decap-cms-llm-dulla
```

`extensions/` is categorised by what an extension plugs into, not by what it does: `widgets/*`
register through the widget registry, `editor/*` extend the editor shell, `llm/*` implement the
`LlmTransport` seam. A new category is a new glob in `pnpm-workspace.yaml` and nothing else.

### Why a second root, and why not `packages/`

These four widgets were the only ones needing a dependency the CMS itself has no use for (`ol`,
`lucide-react`, `@radix-ui/react-icons`, the Vercel AI SDK). Optional peer dependencies were the
previous answer, and DCMS-1971 is the proof they don't hold: the map widget was registered by the
default app entry, so its "optional" peer was mandatory for anyone bundling the root export. A
package cannot import what it does not depend on, so the split makes that class of mistake
structurally impossible rather than merely documented.

`extensions/` is a separate root because these packages are held to a rule `packages/*` is not: they
may only import `@laikacms/decap-cms` through its published subpath exports. No `@/` alias, no reach
into `packages/decap-cms/src`. That is enforced by `no-restricted-imports` in
`extensions/eslint.config.base.mjs`, and their vitest configs deliberately have no alias back into
source, so the CMS must be built before extension tests run - exactly what a third-party author
faces. They are the worked example of a third-party extension, which is only worth anything if they
are built the way a third party has to build one.

The name is `extensions/`, not `community/`: these are first-party and ship in the same release.
`community/` states a support policy (outside-maintained, different standards) that would be a false
promise here. It stays available for the day genuinely outside-maintained packages arrive.

### What it caught immediately

Writing the widgets as outsiders surfaced two holes in the published API, both now filled:

- `useRovingIconFocus` had no public entry point. `src/widgets/icon-picker/index.ts` now exports it
  (the existing `./widgets/*` wildcard already covered the subpath).
- `validateJSONSchema` and its `JSONSchema`/`SchemaError` types were internal, so a widget author
  could not test their own widget schema against the validator the CMS actually runs. Now exported
  from `@laikacms/decap-cms/core`.

Extracting the AI translate feature (DCMS-1395) then forced two more, both structural rather than
cosmetic:

- **A seam where there was none.** Widgets are leaves and the widget registry already accepted them.
  The translate button was called from `EditorControlPane` itself, so extracting it meant inverting
  the dependency: `CMS.registerLocaleAction` renders actions in the editor's locale row, with the
  i18n context (translatable fields, source values, write-back) resolved by the editor. The CMS now
  holds no AI vocabulary, and the seam is generic enough for glossary or translation-memory actions.
- **`registerLocale` replaced instead of merging**, so any extension registering phrases for `en`
  wiped the CMS's own. It now merges, matching what `getPhrases` already did on read. The 36 locale
  packs' translate strings moved into the extension with the feature.

### Widening the seams (2026-08, DCMS-1971 follow-up)

The extracted packages then made the remaining gaps concrete rather than theoretical, so three more
went in. The goal is stated plainly: an extension should be able to do anything the CMS itself can,
without a fork and without reverse-engineering internals.

- **The entry/draft action creators are published API.** The store was already exported but the
  vocabulary to drive it was not, and the aichat widget proved the cost: it shipped a hand-rolled
  copy of `changeDraftField` with the raw `'DRAFT_CHANGE_FIELD'` type string, a private reducer
  contract duplicated in another package. `@laikacms/decap-cms/core` now exports the twelve
  entry/draft actions (`loadEntries`, `persistEntry`, `changeDraftField`, ...), and aichat imports
  the real one.
- **Slots are registerable, not just providable.** `CmsSlots` could only be supplied by the host app
  through `CmsSlotsProvider`, so an extension needed the app's cooperation to render anything.
  `CMS.registerSlot` puts the same surface behind the registry; `useCmsSlots` merges registry under
  provider, so the app still wins on conflict - a deployment must be able to override what one of
  its dependencies renders.
- **Events cover the editor, not just publishing.** The six transform events all fire from `Backend`
  around a save/publish, which is useless to an extension that wants to know a draft opened or a
  field changed. Four notification events (`entryDraftOpen`, `entryDraftChange`,
  `entryDraftDiscard`, `postDelete`) are emitted from a store middleware
  (`core/redux/middleware/extensionEvents.ts`), so no component knows about the event system and
  they fire for every origin - UI, another extension's dispatch, cross-tab replay. They are
  observational by construction: return values ignored, throws logged, so a broken extension cannot
  break editing. That split is why they are a separate list with a separate
  `invokeNotificationEvent` rather than more entries in `allowedEvents`.

### The AI split (2026-08)

The last thing in `src/` that was not the CMS was the AI server: `src/ai/`, a `fetch` handler that
called a model and persisted chat sessions, plus the `ai` and `@ai-sdk/*` dependencies it dragged
along. Nothing in `src/` imported it. It has moved to `@laikacms/server/ai`, where server code
belongs, and the six `./ai*` entries in the export map went with it.

What stayed is the client half, because that half genuinely is the CMS's: an `LlmTransport`
interface, a chat panel, a translate action, and the `LlmDocumentBridge` that lets a transport read
and patch the open draft without touching the store. The transport itself - which model, which
endpoint, which credentials - is supplied by the host, either as a prop or through
`CMS.registerLlmTransport`. `extensions/llm/dulla` is the first implementation and, like the widget
packages, is written against the published exports only.

Two things are deliberately _not_ in the interface. There is no `signIn`/`isAuthenticated`: an AI
endpoint need not trust the same issuer as the git backend, so the CMS has no token to lend that
would be right in general, and credentials are the transport implementor's business. And there is no
`execute` for the document tools server-side: the entry being edited lives in the browser's store,
so the tools run on the client, against the bridge.

### Cost accepted

Releasing is manual and is now five publishes rather than one, and the extension packages must be
version-matched to the CMS (`@laikacms/decap-cms` is a peer, `^4.0.0`). Extension typecheck and
tests require `pnpm --filter @laikacms/decap-cms build` first, the same build-order footgun
`decap-cms-lib-pat` already has. This was weighed against aliasing subpaths to `src` in dev, and
fidelity won: an alias would test a resolution path no consumer ever uses.

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

The new `package.json#exports` map has **21 subpaths** (wildcard entries like `./widgets/*`,
`./backends/*`, `./entry-codecs/*`, and `./format-packs/*` count as one each; the explicit
`"./format-packs/mdx": null` block that excludes the not-yet-implemented mdx pack from the
`./format-packs/*` wildcard counts as its own subpath — see DCMS-1613). The root export `.` points
at `src/app/index.ts` (the old `decap-cms-app` bootstrap). This count drifts as subpaths are added —
it's pinned by `src/__tests__/exports-count.test.ts`, so if that test fails, update both the test
and this line together.

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
  closed. `packages/decap-cms/src/ui/README.md` is the reference example of the per-directory README
  style.

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

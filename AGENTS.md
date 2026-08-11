# AGENTS.md

Agent instructions for `@laikacms/decap-cms`, a single-package fork of Decap CMS v4.beta. The repo
is a pnpm workspace with (for now) one self-named package: **everything package-level lives in
`packages/decap-cms/`** (source, tests, demo, tsconfigs, eslint config, vite/vitest/ playwright
configs). The root is a thin workspace shell (workspace + catalogs, dprint, husky, commitlint, CI)
whose scripts delegate into the package, so all commands below work from the repo root. The
`packages/` folder exists so sibling packages can be added later without a restructure - same layout
as the laikacms/laikacms repo.

Inside the package the former monorepo is flattened: `packages/decap-cms-<name>/src` became
`src/<name>/`, each exposed as a subpath export in `package.json#exports`. The root export is the
`src/app` bootstrap. Background and rationale in `docs/contributing/decisions/restructure.md`.

## Commands

- `pnpm install` (pnpm only, v9, see `packageManager`; Node >= 24)
- `pnpm typecheck`: `tsc --noEmit` (tests excluded from the project)
- `pnpm lint` / `pnpm format`
- `pnpm test`: Vitest, single run; `pnpm test:watch` for watch mode
- `pnpm test:ci`: lint + typecheck + test (run this before declaring work done)
- `pnpm test:e2e`: Playwright (`playwright/*.e2e.ts`); builds and serves the demo itself
- `pnpm build`: tsc to `packages/decap-cms/dist/` via `tsconfig.build.json` + tsc-alias + asset copy
- Demo app: `pnpm build:demo && pnpm serve:dev-test` then open http://localhost:5174 (in-memory
  test-repo backend, fixtures in `packages/decap-cms/dev-test/repo-fixtures.js`, config in
  `packages/decap-cms/dev-test/config.yml`). To verify UI/widget changes end-to-end in a real
  browser, use the `verify` skill (`.claude/skills/verify`).

## Layout (`packages/decap-cms/src/`)

Paths below (and in most other docs) are relative to `packages/decap-cms/`.

- `app/`: classic Decap app shell + `extensions.ts` (widget/backend registration)
- `laika-app/`: new v4.beta "Laika" UI shell (dashboard, command palette, mobile)
- `core/`: engine, with `actions/`, `reducers/`, `redux/`, `hooks/`, `components/`, `formats/`,
  `lib/` (registry, validateConfig, i18n), `routing/` (custom router), `types/`
- `backends/`: github, gitlab, gitea, bitbucket, azure, git-gateway, proxy, test, ...
- `widgets/`: field widgets (string, richtext, list, object, relation, lucide-icon, radix-icon,
  aichat, ...)
- `ai/`: server-side AI chat adapter (fetch handler, providers, tools); widget half lives in
  `widgets/aichat/` (moved here from `@laikacms/decap-ai`, DCMS-492)
- `config-types/`: TS utility types deriving entry shapes from a const-asserted Decap config
- `ui/`: design-system primitives (layering documented in `src/ui/README.md`)
- `lib/`: shared libs: auth, richtext, util, widgets
- `locales/`, `media/`, `dev-server/`, `editor-component-image/`,
  `editor-component-embedded-entry/`, `default-exports/`

## Conventions

- **Commits**: Conventional Commits enforced by commitlint (husky `commit-msg` hook). House style:
  `type(scope): subject (DCMS-nnn)`. Scope is an area slug like `widget-richtext`, `core`, `app`,
  `ui`; include the ticket ID when there is one.
- **Imports**: use the `@/` alias for anything parent-relative inside `src/` (custom ESLint rule
  `local/prefer-alias`, autofixable). `./sibling` imports stay relative. `import/order` is enforced
  with blank lines between groups; use `import type` for types (`consistent-type-imports`).
- **Layering** (custom ESLint rule `local/layer-deps`): `ui` -> `ui/default`/`ui/auth` -> `widgets`
  -> `core`/`app`/`laika-app` components. Do not add new cross-layer edges; a few legacy edges are
  grandfathered. Details in `src/ui/README.md`.
- **No em dashes** anywhere: banned in string/JSX literals by ESLint (`no-restricted-syntax`), and
  by convention in prose and docs too.
- **No Immutable.js** or compat shims. Plain objects/arrays only.
- Emotion for styling (`@emotion/*` lint rules on); formatting via dprint (`dprint.json`): single
  quotes, lineWidth 120, trailing commas when multi-line, no parens on single-param arrows.
  `pnpm format` / `pnpm format:check`.
- TypeScript is `strict`; `moduleResolution: bundler`; alias `@/*` -> `src/*`.

## Testing

- Vitest + jsdom, `globals: false`, so import `describe/it/expect` from `vitest`.
- Tests are colocated in `__tests__/` dirs as `*.spec.tsx` / `*.test.ts`; setup in `vitest.setup.ts`
  (jest-dom, explicit cleanup, ResizeObserver/URL mocks).
- Playwright is the e2e suite (`playwright/*.e2e.ts`); recorded backend fixtures live in
  `playwright/fixtures/`.

## Gated paths: operator approval required

Per OPERATOR-QUEUE.md, do not change without explicit approval from Sem: `package.json` (root and
`packages/*/package.json`), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/`,
`eslint.config.mjs`, `tsconfig*.json`, `vite.config.*` (all under `packages/decap-cms/`), and the
constitutional docs (`docs/contributing/decisions/restructure.md`,
`docs/contributing/decisions/breaking-changes-v4-beta.md`, root `SECURITY.md`).

## Other docs

Repo-level design and process docs live under `docs/contributing/` (index at
`docs/contributing/index.md`), split into two buckets:

- `docs/contributing/decisions/`: why the repo is shaped the way it is.
  - `restructure.md`: single-package-with-subpath-exports rationale
  - `breaking-changes-v4-beta.md`: v4 breaking changes (e.g. `markdown` widget renamed `richtext`)
  - `two-seam-model.md`: Laika protocol vs. CMS adapters
  - `architecture.md`: technology-choice rationales (Emotion, Effect, `yaml`, ...)
  - `format-packs-plan.md`: forkable richtext formats and PT-native component blocks
- `docs/contributing/learnings/`: things verified or discovered while working on the repo.
  - `tech-debt.md`: remaining debt checklist
  - `dcb-001-pnpm-install.md`: `pnpm install` peer-dep verification record

Component/API notes live closer to the code: Base UI primitive notes in
`packages/decap-cms/src/ui/README.md`, core-engine notes in `docs/core/`, and per-area READMEs
alongside their `src/` folders.

- `CONTRIBUTING.md` (repo root): setup, PR process, release

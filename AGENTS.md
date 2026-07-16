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
`src/app` bootstrap. Background and rationale in RESTRUCTURE.md.

## Commands

- `pnpm install` (pnpm only, v9, see `packageManager`; Node >= 20)
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
- `widgets/`: field widgets (string, richtext, list, object, relation, ...)
- `ui/`: design-system primitives (layering documented in `src/ui/README.md`)
- `lib/`: shared libs: auth, richtext, util, widgets
- `locales/`, `media/`, `dev-server/`, `editor-component-image/`, `default-exports/`

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
- Playwright is the active e2e suite; the `cypress/` dir is legacy, don't extend it.

## Gated paths: operator approval required

Per OPERATOR-QUEUE.md, do not change without explicit approval from Sem: `package.json` (root and
`packages/*/package.json`), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/`,
`eslint.config.mjs`, `tsconfig*.json`, `vite.config.*` (all under `packages/decap-cms/`), and the
constitutional docs (`RESTRUCTURE.md`, `BREAKING_CHANGES_V2_BETA.md`, `SECURITY.md`).

## Other docs

- `CONTRIBUTING.md`: setup, PR process, release
- `WORKLIST.md`: v4.beta task queue (DCB-xxx) and fleet workflow
- `BREAKING_CHANGES_V2_BETA.md`: v2 breaking changes (e.g. `markdown` widget renamed `richtext`)
- `DEPENDENCY_REDUCTION_PLAN.md`: active dependency-trimming plan
- `TECH_DEBT.md`: remaining debt checklist

# WORKLIST — decap-cms v4.beta

> One row per atomic task. Workers pick from this list per the rules below. The reviewer maintains
> state on existing rows; workers may ADD new rows when the worklist runs dry (see "Growing the
> worklist"). Task IDs use the `DCB-XXX` prefix (Decap-Cms-Beta).

## Status legend

- `pending` — not started, eligible if all deps are merged
- `wip` — has an open PR
- `done` — PR merged

The reviewer auto-merges every clean non-gated PR. The operator intervenes only when a worker
explicitly asks for a decision, or when a change touches a gated path (see OPERATOR-QUEUE.md).

## Growing the worklist

If every WORKLIST row is `done` or `wip` and there's no open PR queue, the orchestrator's worker
subagent reads `RESTRUCTURE.md`, `TECH_DEBT.md`, `BREAKING_CHANGES_V2_BETA.md`, and the latest
`CHANGELOG.md`, then APPENDS new `Status: pending` rows for whatever the v4.beta restructure implies
next. Each new row must:

- pick a fresh `DCB-XXX` ID (highest existing + 1),
- declare `Effort: <XS|S|M|L> · Deps: <existing DCB-IDs or none>`,
- list at least one acceptance criterion and the primary file(s) it will touch,
- be small enough to ship in one PR.

The v4.beta effort is a TypeScript-first restructure of decap-cms: dropping legacy editors, removing
deprecated aliases/deps (iarna-toml, cms aliases), fixing mixed CJS/ESM exports and double casts,
repairing eslint flat config + import rules, and stabilizing the e2e/cypress suite. Many in-flight
branches already exist under `claude/v4-beta-*` — check `git branch -r` and open PRs before adding a
row that duplicates work already in progress.

## Tasks

### DCB-001 — Verify `pnpm install` passes with no unexpected peer-dep warnings

Epic: restructure-verification · Effort: XS · Status: pending · Deps: none

**Acceptance criteria:**
- `pnpm install` completes without peer-dep warnings beyond the expected `react`, `react-dom`, `@emotion/react`, `@emotion/styled`

**Primary files:** `package.json`, `pnpm-workspace.yaml`

---

### DCB-002 — Verify `pnpm typecheck` passes after the single-package restructure

Epic: restructure-verification · Effort: M · Status: pending · Deps: DCB-001

**Acceptance criteria:**
- `pnpm typecheck` exits 0 with no type errors introduced by the monorepo → single-package move (cross-package import rewrites, missing index files, extension mismatches)

**Primary files:** `tsconfig.json`, `src/`

---

### DCB-003 — Verify `pnpm build` produces all 38 dist subpath artifacts

Epic: restructure-verification · Effort: S · Status: pending · Deps: DCB-002

**Acceptance criteria:**
- `pnpm build` exits 0 and `dist/<name>/index.js` + `dist/<name>/index.d.ts` exist for every subpath declared in `package.json#exports`
- Any subpath with no matching `src/<name>/index.{ts,tsx}` is either given a stub file or removed from `exports`

**Primary files:** `package.json`, `src/`

---

### DCB-004 — Verify `pnpm test` passes with updated vitest include patterns

Epic: restructure-verification · Effort: S · Status: pending · Deps: DCB-002

**Acceptance criteria:**
- `pnpm test` exits 0
- `vitest.config.ts` include patterns glob `src/**/*.test.{ts,tsx}` (no stale `packages/**` references)

**Primary files:** `vitest.config.ts`

---

### DCB-005 — Fix mixed named+default exports in `src/app/index.ts`

Epic: tech-debt · Effort: S · Status: pending · Deps: DCB-002

**Acceptance criteria:**
- `src/app/index.ts` uses only named exports (no `export default` alongside named exports)
- Downstream consumers updated to import the named export instead of the default

**Primary files:** `src/app/index.ts`

---

### DCB-006 — Add ESLint rules to enforce import patterns within `src/`

Epic: tech-debt · Effort: S · Status: pending · Deps: DCB-002

**Acceptance criteria:**
- `eslint.config.mjs` includes a rule (e.g. `import-x/no-relative-packages` or custom) that prevents any `from 'decap-cms-*'` or `from '@laikacms/decap-cms/*'` string inside `src/`
- `pnpm lint` exits 0 after the rule is added

**Primary files:** `eslint.config.mjs`

# OPERATOR QUEUE — decap-cms v4.beta

> Items that block the next stretch of work. The operator (Sem) owns these — workers must not
> attempt them. Items move off this list either by being done (deleted) or by becoming a fully
> specified WORKLIST item a worker can pick up.
>
> Last reconciled: 2026-06-08 (pink-operator — fleet scaffolding bootstrap; no operator items
> outstanding).

## Gated paths (operator-only)

Workers must not auto-merge changes that touch these without an operator decision:

- `package.json` (root and `packages/*/package.json`) / `pnpm-workspace.yaml` / `pnpm-lock.yaml` —
  dependency or workspace topology changes (the v4.beta dependency drops are operator-gated since
  they break downstream consumers).
- `.github/` — CI/workflow changes.
- `eslint.config.mjs`, `tsconfig*.json`, `vite.config.*` (under `packages/decap-cms/`) —
  toolchain/config changes.
- `RESTRUCTURE.md`, `BREAKING_CHANGES_V2_BETA.md`, `SECURITY.md` — constitutional / breaking-change
  docs.

## Critical path (operator-only)

_Nothing blocking. Bootstrap state._

## PRs awaiting merge

_None tracked yet._

## Recently resolved

_None yet._

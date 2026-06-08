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

_None yet — bootstrap. The orchestrator's first non-idle run will grow this list from
`RESTRUCTURE.md` / `TECH_DEBT.md`. Until then the worker fast-exits each tick (correct, not a bug)._

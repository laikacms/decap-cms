# DCB-001 Verification: pnpm install

Verified on: 2026-07-28 Result: PASS — no peer-dep warnings

Verified against commit `6f1ddf9b15ba58257a8321906b50a8294ab86d51` (`origin/v4.beta` HEAD at
verification time). This re-verification was triggered by DCMS-1560/DCMS-1557: PR #1550
(`5dbbad017`, "feat(config-types): split into types.ts + runtime schema converters") added `zod`
to `packages/decap-cms/package.json`'s `peerDependencies` (as an optional peer via
`peerDependenciesMeta`) without a corresponding update to this doc, which went unnoticed because
no pinning test existed to catch the drift. A pinning test now exists
(`packages/decap-cms/src/core/lib/__tests__/peerDependencies.spec.ts`) asserting the
`peerDependencies`/`peerDependenciesMeta` keys below, so future changes to that block fail CI
instead of silently drifting this doc.

This supersedes the 2026-07-21 record below, which predates the `zod` peer and is now stale. This
doc is a point-in-time snapshot re-run whenever the peerDependencies block changes materially, not
a continuously-maintained invariant — see "Note on doc lifecycle" below.

## Peer set checked (current, post-#1550/zod)

Required:

- `react` `^19.0.0`
- `react-dom` `^19.0.0`
- `@emotion/react` `^11.14.0`
- `@emotion/styled` `^11.14.1`

Optional (via `peerDependenciesMeta`):

- `@apollo/client` `^4.2.7`
- `@radix-ui/react-icons` `^1.3.2`
- `graphql` `^16.13.2 || ^17.0.0`
- `graphql-tag` `^2.12.6`
- `lucide-react` `^1.7.0`
- `ol` `^6.9.0 || ^7.0.0 || ^8.0.0 || ^9.0.0 || ^10.0.0`
- `uploadcare-widget` `^3.23.4`
- `uploadcare-widget-tab-effects` `^1.7.2`
- `zod` `^4.0.0`

## Observed result

`pnpm install` was run against a clean install (`node_modules` removed from both the workspace
root and `packages/decap-cms/`, then `pnpm install --frozen-lockfile`) from a worktree checkout of
`origin/v4.beta`, lockfile already in sync ("Lockfile is up to date, resolution step is skipped").
Full stdout/stderr:

```
Scope: all 2 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +1086
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1086, reused 1086, downloaded 0, added 215
Progress: resolved 1086, reused 1086, downloaded 0, added 537
Progress: resolved 1086, reused 1086, downloaded 0, added 739
Progress: resolved 1086, reused 1086, downloaded 0, added 1080
Progress: resolved 1086, reused 1086, downloaded 0, added 1086, done

devDependencies:
+ @changesets/cli 2.31.1
+ @commitlint/cli 21.2.1
+ @commitlint/config-conventional 21.2.0
+ dprint 0.55.2
+ husky 9.1.7
+ rimraf 6.1.3

. prepare$ husky
. prepare: Done
Done in 5.3s using pnpm v9.15.9
```

`grep -i "peer\|WARN\|deprecated"` against the captured output returned nothing — no peer-dep
warnings for any peer in the current set (required or optional, including the new `zod` peer), and
no `husky - install command is DEPRECATED` notice this run.

## Summary

`pnpm install` completed cleanly with 1086 packages resolved (all reused, none freshly
downloaded — lockfile already satisfied everything). No peer-dep warnings were emitted for the
full current peer set (`@emotion/react`, `@emotion/styled`, `@apollo/client`,
`@radix-ui/react-icons`, `graphql`, `graphql-tag`, `lucide-react`, `ol`, `react`, `react-dom`,
`uploadcare-widget`, `uploadcare-widget-tab-effects`, `zod`).

## Note on doc lifecycle

This doc is kept as a maintained record (not archived), since peerDependencies changes are
infrequent but do recur (this is now the third full rebuild/update of that block). Re-verify and
bump the "Verified on" date/commit whenever `packages/decap-cms/package.json`'s
`peerDependencies`/`peerDependenciesMeta` block changes, rather than treating this file as
permanently accurate. A pinning test
(`packages/decap-cms/src/core/lib/__tests__/peerDependencies.spec.ts`) now fails CI when that block
changes, as a backstop against this doc drifting silently again.

---

## Prior record (superseded, kept for history)

Verified on: 2026-07-21 Result: PASS — no peer-dep warnings

Verified against commit `a5f3f7a2a968b4ffc05daf55a16ae0151674fd0c` (`origin/v4.beta` HEAD at
verification time), which includes `41aff10e5` (2026-07-20, "build: trim dependencies, flatten
catalogs and add new subpath exports") that rebuilt the `peerDependencies` /
`peerDependenciesMeta` block in `packages/decap-cms/package.json` from scratch. Peer set checked:
`react`, `react-dom`, `@emotion/react`, `@emotion/styled` (required); `@apollo/client`,
`@radix-ui/react-icons`, `graphql`, `graphql-tag`, `lucide-react`, `ol`, `uploadcare-widget`,
`uploadcare-widget-tab-effects` (optional, via `peerDependenciesMeta`). `pnpm install` completed
cleanly with 1086 packages resolved (all reused); no peer-dep warnings.

Verified on: 2026-06-08 Result: PASS — no unexpected peer-dep warnings

Checked against the pre-`41aff10e5` peer set (`react`, `react-dom`, `@emotion/react`,
`@emotion/styled` only). None of those peer-dep warnings appeared — they were fully satisfied by
the installed versions. `pnpm install` completed cleanly with 1088 packages resolved (all reused
from cache); a `husky - install command is DEPRECATED` notice (from the `prepare` script, not a
peer-dep warning) was observed at that time.

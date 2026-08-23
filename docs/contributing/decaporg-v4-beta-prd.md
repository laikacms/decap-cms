# PRD: contribute this fork's core to decaporg as `v4-beta`

Companion to [decisions/decaporg-v4-merge-plan.md](./decisions/decaporg-v4-merge-plan.md), which
holds the decision records (D1-D14) and their rejected alternatives. This document is the
implementable spec: what gets built, how it is tested, and what must never break while it happens.

Not filed on the issue tracker - held locally by agreement. Measured against `upstream/main` at
`2b772c789`.

## Problem Statement

The Decap org has asked Sem to contribute this fork's rewritten core back to `decaporg/decap-cms` as
a breaking **v4**, starting from feature parity, with the legacy `markdown` widget droppable.

Three things stand in the way, and none of them are visible from the original three-step plan:

**The two histories cannot be reconciled by cherry-picking.** The fork is 1004 commits ahead and 70
behind, and the merge base has been frozen at `6ef2f9bdf` since the single-package restructure moved
every source path. A cherry-pick creates a new SHA, so the merge base never moves and the fork never
converges - the divergence just keeps growing while both lines stay active.

**Stripping the fork's editor leaves a hole, not a clean subset.** decaporg's `main` already ships a
Plate-based `richtext` widget alongside `markdown`; this fork deleted both and replaced them with
Lexical plus a Portable Text value model. Removing Lexical from the contribution therefore removes
rich-text editing entirely, which fails parity on the most-used widget in the product. Lexical is not
stable enough to hand over in its place.

**Parity has no referent and no proof.** decaporg's e2e suite selects on Emotion display names from
`decap-cms-ui-default`, a package this fork replaced with a Base UI rewrite - so their tests cannot
run here as an acceptance gate, and "feature parity" against a `main` that moved 70 commits during
the fork window is a target that recedes on every merge.

Meanwhile work on this fork's `main` continues in parallel, and its clients already depend on the
published `@laikacms/decap-cms` subpath exports for `laika-app` and Lexical. Neither can be removed
or frozen to make the contribution easier.

## Solution

Converge the histories honestly, then carry a **thin, rebasable strip** on top.

`main` merges decaporg's history at a pinned SHA using `-s ours` after the substantive upstream
commits are hand-ported, which moves the merge base to the pin without touching a file. A `v4-beta`
branch is cut from `main` with full ancestry, so merges flow both ways afterwards with real merge
bases instead of manual triage. On that branch the contribution takes shape as a short, ordered
commit series: rename, then **one** strip commit removing Laika and Lexical, then the Plate richtext
port, then the gating specs.

Because the strip is a single isolated commit, keeping `v4-beta` current with a moving `main` is a
one-commit rebase rather than a merge of 1004. And because the histories share ancestry, once
decaporg accepts the branch a single `-s ours` merge on the return path permanently stops those
deletions from ever proposing themselves against the package this fork's clients ship.

Parity is pinned to one SHA - the same commit as the `-s ours` merge - so the port checklist and the
parity checklist can never drift apart. It is evidenced by the existing Playwright replay suite,
which already covers decaporg's backend-parametrized e2e fixtures, extended to close the remaining
gaps. Review is behavioral, with line-by-line review scoped to auth, backends, and sanitization -
the surfaces where a rewrite introduces a vulnerability rather than a bug.

## User Stories

### Contributing the work

1. As the fork maintainer, I want `main` to become a descendant of decaporg's history at a known
   commit, so that future upstream fixes arrive as ordinary merges instead of hand-triaged patches.
2. As the fork maintainer, I want every substantive upstream commit ported **before** the `-s ours`
   merge, so that the merge does not silently swallow work git will never surface again.
3. As the fork maintainer, I want the port checklist grouped by *how* each commit ports, so that I
   do not waste effort patching files that no longer exist in this tree.
4. As the fork maintainer, I want dependabot bumps and `chore(release)` commits excluded from the
   checklist, so that I port ~33 commits of real work instead of triaging 70.
5. As the fork maintainer, I want the parity SHA and the merge SHA to be the same commit, so that
   the two checklists cannot drift.
6. As the fork maintainer, I want anything upstream lands after the pin tracked as post-merge issues,
   so that parity is a finite list rather than a target that recedes on every upstream merge.
7. As the fork maintainer, I want `v4-beta` cut from `main` with full ancestry, so that decaporg's
   later fixes merge back into my fork instead of needing cherry-picks forever.
8. As the fork maintainer, I want the strip confined to exactly one commit, so that keeping the
   branch current is a one-commit rebase rather than a recurring merge exercise.
9. As the fork maintainer, I want the package rename in its own commit *before* the strip, so that
   the strip stays a pure removal and rebases mechanically.
10. As the fork maintainer, I want a scripted, deterministic check that the strip commit removed
    exactly the expected paths and nothing else, so that a bad rebase cannot quietly delete core.
11. As the fork maintainer, I want to be able to regenerate the branch state from `main` at any
    time, so that months of upstream review do not leave the contribution stale.

### Protecting the fork and its clients

12. As a Laika client, I want `@laikacms/decap-cms` to keep exporting `./laika-app` and
    `./lib/richtext/lexical`, so that contributing core upstream does not break my build.
13. As the fork maintainer, I want `main` to keep shipping Laika and Lexical throughout, so that
    the contribution never requires freezing or downgrading the product clients pay for.
14. As the fork maintainer, I want a guarded return path after acceptance, so that the first merge
    of decaporg's fixes does not propose deleting `laika-app` from my clients' package.
15. As the fork maintainer, I want work on `main` to continue in parallel with the contribution, so
    that the fork's roadmap is not blocked on decaporg's review latency.
16. As the fork maintainer, I want the Portable Text value model to stay on `main`, so that the
    contribution stays small and reviewable without giving up the format-pack architecture.

### The richtext widget

17. As a Decap site owner, I want v4 to ship a working rich-text editor, so that upgrading does not
    remove the primary way my editors write content.
18. As a Decap site owner, I want v3 markdown files to survive being opened and saved with no edits
    byte-for-byte, so that upgrading does not silently rewrite my repository.
19. As a Decap site owner, I want the richtext widget to behave the way v3's did, so that my editors
    do not need retraining.
20. As a Decap maintainer, I want the ported richtext widget written in TypeScript with plain
    objects, so that it matches the rest of v4 rather than reintroducing Immutable.
21. As a Decap maintainer, I want the port taken from the pinned upstream SHA, so that the richtext
    fixes landed since the fork point come along without being ported individually.
22. As a content editor, I want lists, images in list items, code blocks, links, marks, quotes,
    hotkeys, and shift+enter breaks to behave as they did, so that my muscle memory still works.
23. As a content editor, I want pasting from a word processor or a web page to produce the same
    markup it did in v3, so that my existing workflow is unaffected.
24. As a Decap site owner, I want `registerEditorComponent` to keep working, so that my custom
    shortcodes survive the upgrade.
25. As a Decap site owner, I want `editor_components` in my config to stop being a hard error, so
    that my existing config loads on v4.
26. As a Decap maintainer, I want the editor-component registry owned by the widget rather than
    core, so that core does not re-grow an API tied to one editor's implementation.
27. As the fork maintainer, I want Lexical to remain shippable to Decap users later as an opt-in,
    so that today's decision does not permanently foreclose the better editor.

### Parity and evidence

28. As a Decap maintainer, I want parity defined as a written checklist against a named SHA, so that
    "feature parity" is checkable rather than arguable.
29. As a Decap maintainer, I want the richtext port's specs passing before the branch is offered, so
    that the one piece of genuinely new code is not the one piece with no coverage.
30. As a Decap maintainer, I want the backend e2e suites replaying decaporg's own recorded fixtures,
    so that parity on the backends is demonstrated against their data, not ours.
31. As a Decap maintainer, I want the eight `markdown_widget_*` specs explicitly declared out of
    scope, so that their absence reads as a decision rather than an omission.
32. As a Decap maintainer, I want the i18n, field-validation, and proxy/test-backend gaps in the e2e
    suite closed, so that parity coverage is not silently narrower than v3's.
33. As a Decap maintainer, I want a running demo of the branch, so that I can evaluate parity by
    using it rather than by reading 246,000 lines.
34. As a Decap maintainer, I want line-by-line review scoped to auth, backends, and sanitization, so
    that my limited review time lands where a rewrite can actually hurt users.
35. As a Decap maintainer, I want the contributor's own security review findings handed over first,
    so that I am not the only line of defense on 108 files of rewritten backend code.
36. As a Decap maintainer, I want upstream's sanitization fix present in the branch, so that v4 does
    not ship a regression of a security fix v3 already has.

### Upgrading to v4

37. As a Decap site owner, I want every breaking change listed in one document, so that I can assess
    the upgrade before starting it.
38. As a Decap site owner, I want the Immutable removal documented with a migration section, so that
    I know why my preview template stopped rendering.
39. As a third-party widget author, I want the prop-shape change from Immutable to plain objects
    spelled out, so that I can update `field.get('name')` to `field.name` without guessing.
40. As a third-party widget author, I want the mapping from old package names to v4 subpaths
    documented, so that I know what to import instead of `decap-cms-ui-default`.
41. As a third-party widget author, I want the deprecated npm packages to point at v4, so that
    installing them tells me what happened.
42. As a Decap site owner using the CDN, I want `<script src=".../dist/decap-cms.js">` to keep
    resolving on v4, so that the most common installation method does not 404.
43. As a Decap site owner on a bundler, I want `require('decap-cms')` to keep working, so that CJS
    consumers are not silently broken by the move to ESM.
44. As a Decap site owner, I want the v4 bundle to be no larger than v3's, so that the upgrade does
    not regress my page weight.

## Implementation Decisions

### History convergence

- `main` merges the pinned upstream SHA with `git merge -s ours`. The pin is recorded in the plan
  document and is the same commit used as the parity target.
- The port checklist is a hard gate on that merge. It is partitioned four ways, because most of the
  70 commits do not port as patches:
  - **Already present** - verify only (uuid widget, `crypto.randomUUID`, Forgejo backend, React JSX
    runtime). Forgejo needs its *editorial workflow* support verified specifically.
  - **Subsumed by the richtext port** - do not port individually; porting the widget from the pin
    carries them (block images in list items, shift+enter break nodes, paste handling).
  - **Behavioral equivalence, not a patch** - the responsive-UI and group-by-heading commits touch
    `decap-cms-ui-default`, which does not exist here. Verify the behavior in `src/ui`.
  - **Real work** - Collaborative Notes Pane, collection size limit, browser image transformations,
    plus the fixes and locales that patch cleanly. The sanitization fix is prioritized.

### Branch shape

- `v4-beta` is cut from `main` post-merge. Version `4.0.0-beta.0`.
- Commit order is fixed, and each commit has a single concern:
  1. rename `@laikacms/decap-cms` to `decap-cms` across the exports map, docs, and tests
  2. **the strip** - one commit
  3. the Plate richtext port and the editor-component registry
  4. the CDN/CJS entry fix
  5. the gating richtext specs
- The strip removes: `laika-app/`, `backends/laika/`, the Lexical `widgets/richtext`,
  `lib/richtext/`, `format-packs/`, the Portable Text hooks in core's registry, the `lib/richtext`
  coupling in the editor's markdown hint and preview HOC, and the Laika references in `ui` and
  `ui/default`. It contains no additions and no renames.
- Extraction into separate packages was rejected: clients depend on the published `./laika-app` and
  `./lib/richtext/lexical` subpaths, so extraction is itself a breaking change on a shipped package.
- Keeping `v4-beta` current is `git rebase --onto main`. Modify/delete conflicts are tree-level, so
  no merge driver can suppress them - isolating the strip to one commit is the mitigation.
- After acceptance, one `git merge -s ours decaporg/v4-beta` into `main` closes the return path.

### Published contract changes

- **Exports map.** `./laika-app`, `./laika-app/bare`, `./lib/richtext`, `./lib/richtext/lexical`,
  `./format-packs/*`, and `./format-packs/mdx` leave the map on `v4-beta`. The remaining subpaths
  keep their shape and names.
- **CJS and CDN entry.** The CDN build currently emits `iife` and `es`. **An IIFE bundle assigns a
  global and does not set `module.exports`, so it cannot serve as a `main` entry.** The RC switches
  the CDN format from `iife` to `umd`, which satisfies both the `<script>` tag and `require()`, and
  adds a `main` field plus a `dist/decap-cms.js` path so v3's documented CDN URL keeps resolving.
- **Config schema.** `editor_components` returns from hard error to a valid key. This touches the
  JSON schema and the config validator, and it is a published config contract - the shape restored
  is upstream's full shape (`id`, `label`, `fields`, `pattern`, `fromBlock`, `toBlock`,
  `toPreview`), not a trimmed subset, because widening it later would be a second breaking change
  inside one major.
- **npm namespace.** v4 publishes `decap-cms` alone; the other 40 names are deprecated post-publish
  with pointers to v4 subpaths.

### Richtext port

- Upstream's Plate widget is ported from the pinned SHA: 70 `.js` files, Immutable in ten of them,
  rewritten to TypeScript against the fork's widget control props with plain objects.
- The widget reads and writes markdown strings. It does not target Portable Text.
- The editor-component registry lives in the widget. Core exposes only a thin passthrough on the
  `CMS` object, matching the shape already used for the Portable Text block and format registries -
  core stores nothing and delegates. The doc-pin test asserting the API's absence is relaxed, since
  the global is assembled in core and the name must appear there even though the semantics do not.

### Review model

- Behavioral review carries the functional argument: parity checklist, e2e suites, running demo.
- Code review is scoped to `backends/`, `lib/auth`, and the sanitization paths.
- An internal security review of those surfaces runs first and its findings are handed over.
- No upfront RFC. Accepted consequence: five ecosystem-wide decisions - the single-package move and
  npm deprecations, the Immutable removal, the UI rewrite, the shortcode semantics, and the richtext
  direction - remain reversible by decaporg after the work exists.

## Safeguards

### Invariants

- **Convergence holds.** After the merge, the pinned SHA is an ancestor of `main`, and the count of
  commits reachable from the pin but not from `main` is zero. Asserted, not assumed.
- **The strip is a pure removal.** The strip commit adds no files and renames none. Its deletions are
  exactly the declared path set - an explicit allowlist, so a bad rebase cannot quietly remove core.
- **The strip stays one commit.** More than one strip commit on `v4-beta` is a failure; the rebase
  guarantee depends on it.
- **`main` never loses client-facing surface.** `laika-app/`, `lib/richtext/`, and the
  `./laika-app`, `./laika-app/bare`, `./lib/richtext`, `./lib/richtext/lexical` subpath exports must
  be present on `main` at every commit. This is the one invariant whose violation reaches paying
  users, and it must survive the post-acceptance return merge.
- **`v4-beta` carries no Laika.** No `@laikacms` string and no Laika identifier in shipped code,
  exports, or `package.json` on the branch.
- **Round-trip fidelity.** A v3 markdown corpus opened and saved with no edits produces byte-identical
  output. Where normalization is unavoidable, it is idempotent - a second save is a no-op - and every
  normalizing case is enumerated in the breaking-changes document rather than discovered by users.
- **No orphaned widget slot.** `v4-beta` always resolves `widget: richtext` to a working control.
  A branch state where the strip has landed and the port has not is not a valid branch state.
- **Exports resolve.** Every subpath in the exports map resolves to a built artifact; every subpath
  referenced in docs exists in the map. Both directions.

### Performance ceilings

- The repo already tracks bundle size in `.github/bundle-size.json`; `main`'s root entry is
  currently **1.62 MB gzip / 5.25 MB minified**.
- `v4-beta`'s root entry must be **materially smaller** than `main`'s - the strip removes Lexical
  and the Laika shell, so a flat or larger number means the strip did not take effect.
- `v4-beta`'s root entry must not exceed decap v3's published bundle. Upgrading must not regress
  page weight; this is the number a maintainer will check first.
- The bundle-size entries for the removed `./laika-app` and `./laika-app/bare` keys are dropped on
  the branch rather than left stale.

### Security and data integrity

- **The sanitization fix is a gate.** Upstream's HTML link/image sanitization and proxy URL
  validation must be present before the branch is offered. Shipping v4 without a fix v3 already has
  is a regression, not a gap.
- **Auth material never leaks.** Tokens, PKCE verifiers, and refresh tokens are never logged, never
  placed in URLs beyond the flows that require it, and never returned in error payloads. The
  git-gateway and GitLab PKCE fixes in the checklist touch exactly this surface.
- **The internal security review precedes the offer**, covering the backends, `lib/auth`, and the
  sanitization paths, with findings handed over rather than held.
- **Round-trip loss is a data-integrity bug, not a formatting nit.** Any case where saving an
  unedited v3 file changes its content is release-blocking for `v4-beta`, because it corrupts user
  repositories silently and at scale.
- **Deprecation is not deletion.** The 40 deprecated npm packages are deprecated, never unpublished;
  existing installs must keep resolving.

## Testing Decisions

A good test here asserts **externally observable behavior at a published boundary** - what a Decap
site owner, a widget author, or git itself can see - and says nothing about how the code is
arranged. That distinction does real work in this slice: most of the change is code *moving*, so a
test coupled to structure fails on every commit while proving nothing, and a test coupled to
behavior is exactly the regression net the move needs.

Existing seams are reused wherever they exist. One seam per dataflow.

### Seam 1 - Git ancestry and branch shape (new)

The only new seam. A script, run in CI, asserting the convergence and strip invariants: the pin is
an ancestor of `main`; nothing is reachable from the pin but not `main`; the strip is one commit;
its deletions match the declared allowlist exactly; `main` still exports the client-facing subpaths.

Prior art: the repo already runs meta-tests that read repository state and assert on it - the
commitlint house-style test and the stale-file-reference doc pins are the same shape. This extends
that idiom to git plumbing rather than inventing a new mechanism.

### Seam 2 - Published package contract (existing)

The subpath-export and doc-reference pin tests already assert that exports resolve and that docs
reference only real subpaths. Extended, not replaced, to cover the rename, the removed subpaths, the
`main` field, and the `dist/decap-cms.js` path.

The UMD entry needs one test the existing pins do not give: that the built bundle is loadable both
as a `<script>` tag and via `require()`. That is the whole point of switching from `iife`, and it is
the kind of packaging claim that is otherwise only discovered by users.

Bundle ceilings are asserted through the existing `.github/bundle-size.json` mechanism.

### Seam 3 - Richtext value round-trip (existing, upstream's)

**The highest-leverage seam in the slice, and it is a pure function.** Markdown string in, editor
value, markdown string out - no DOM, no React, no browser. Upstream ships serializer tests at exactly
this seam; they port first, because this is where data-integrity bugs live and the only place they
can be tested exhaustively and fast.

The corpus is v3 markdown fixtures. The assertion is byte-identity on an unedited round trip, plus
idempotence where normalization is unavoidable.

### Seam 4 - Richtext editing behavior (existing, replaced)

The current Playwright richtext suite tests Lexical and dies with the strip. Its replacement is
ported from upstream's `richtext_widget_*` cypress specs - backspace, code block, enter, hotkeys,
link, list, marks, quote - rewritten against the new DOM with `data-testid` selectors.

This suite stays deliberately thin. Fidelity belongs in seam 3; this seam covers only what requires
a real browser: keystroke handling, selection, and toolbar interaction.

Component-level coverage of the control sits alongside the widget in the existing colocated test
directories.

### Seam 5 - Registration and config validation (existing)

The core registry and config-validator test suites already cover registration and schema acceptance.
Extended to cover the editor-component passthrough, the removal of the Portable Text hooks, and
`editor_components` moving from hard error to valid key. The doc-pin test asserting the removed API's
absence is relaxed here rather than deleted, so it keeps asserting something true.

### Seam 6 - Backends and auth (existing)

**Already largely built.** The Playwright replay suite covers BitBucket, git-gateway GitHub and
GitLab, GitHub REST/GraphQL/open-authoring, and GitLab, across editorial workflow, simple workflow,
and media library - replaying decaporg's own recorded fixtures. This is the strongest parity evidence
available and it exists today.

The remaining gap is narrower than the plan document estimated: **i18n**, **field validations**, and
the **proxy and test-backend variants**. Those close post-acceptance; the richtext suite is the only
e2e work that gates the branch, because it is the only genuinely new code.

Backend unit suites cover the ported PKCE, Bearer-scheme, and LFS fixes at the client level.

## Documentation Impact

This repo has no `CONTEXT.md` and no `docs/adr/`; `docs/contributing/decisions/` is the ADR
equivalent and `AGENTS.md` carries the conventions.

- **Decision records** - `decisions/decaporg-v4-merge-plan.md` is the record for D1-D14 and is
  updated as decisions move. If decaporg reverses the single-package decision, that reversal is
  recorded there rather than silently applied.
- **Breaking changes** - `decisions/breaking-changes-v4-beta.md` gains the **missing Immutable
  removal entry**, with a migration section covering preview templates and widget control props.
  This is a defect in the document today, independent of the merge, and worth fixing on `main`
  regardless. The entries for the richtext direction, the editor-component registry's new ownership,
  and the npm namespace collapse are added alongside it.
- **API docs** - the widget-authoring and preview-template docs need the plain-object prop shapes;
  the editor-component docs need the widget-owned registry; the community-widgets doc needs the
  old-package-name to v4-subpath mapping.
- **Install docs** - the CDN URL and the `require()` entry, once the UMD switch lands.
- **Glossary** - no `CONTEXT.md` exists to update. If one is introduced, `v4-beta`, "the pin", and
  "the strip commit" are the terms this slice would contribute.

## Out of Scope

- **Landing Lexical or Portable Text in v4.** Deliberately deferred; it needs a second breaking
  change, which is the accepted cost of keeping this contribution reviewable.
- **The `markdown` widget.** Dropped by agreement. Its eight cypress specs are not ported, and that
  is stated rather than left implicit.
- **Extracting `laika-app` or Lexical into separate packages.** Rejected - clients depend on the
  published subpaths.
- **Upstream commits landing after the pin.** Tracked as post-merge issues on `v4-beta`.
- **Compatibility shims for the 40 deprecated package names.** Rejected; reconsider only if decaporg
  reverses the single-package decision.
- **A runtime trap for Immutable-shaped access.** Documented only. Reconsider if support load becomes
  decaporg's stated objection.
- **An upfront RFC to decaporg.** Building first is a deliberate choice with a named risk.
- **The i18n, field-validation, and proxy/test-backend e2e gaps.** Post-acceptance.
- **The migration guide and npm deprecations.** Post-acceptance and post-publish respectively.
- **Freezing or slowing work on `main`.** Explicitly not a constraint; the rebase cadence exists so
  the fork's roadmap keeps moving.

## Further Notes

**Where this fails is the Plate port.** Everything else in this slice is code that already works
being moved, renamed, or deleted, with 476 unit tests and a backend replay suite standing behind it.
The Plate widget is the sole exception: new code, on a rewritten core, replacing a better editor the
author would rather ship, with no prior coverage. That asymmetry is why it is the only thing gating
the branch, and why the round-trip seam is a pure function rather than a browser test - it is the
one place where thoroughness is cheap.

**The second risk is sequencing, not engineering.** Building before the ecosystem decisions are
agreed means the single-package move can be reversed after the work exists, and the rebase cadence
runs for the whole of decaporg's review window. Both are accepted, but the branch should be offered
as early as it is coherent rather than as late as it is complete - the review latency is the
schedule, and it starts when they see it.

**The convergence trick is worth stating plainly to decaporg**, because `-s ours` looks like
sleight of hand if it arrives unexplained. It is honest only in combination with the completed port
checklist, and the checklist is the part worth showing.

# Merging this fork into decaporg as v4

Plan of record for contributing this fork's core back to `decaporg/decap-cms` as a breaking v4
release. decaporg's opening terms: merge the work as a breaking major, **start with feature
parity**, and the legacy `markdown` widget may be dropped.

Status: agreed with Sem, not yet proposed to decaporg. Decisions below were settled in a grilling
session; each records the alternatives so a later reversal is cheap to reason about.

## Ground truth at time of writing

Measured against `upstream/main` at `2b772c789`:

|              | decaporg v3                                         | this fork                                     |
| ------------ | --------------------------------------------------- | --------------------------------------------- |
| divergence   | merge base `6ef2f9bdf`                              | **1004 ahead / 70 behind**                    |
| full diff    |                                                     | **2,646 files, +246,006 / -180,527**          |
| npm packages | 41                                                  | 1 (`@laikacms/decap-cms`, 30 subpath exports) |
| module type  | `commonjs`, no `exports` field                      | `"type": "module"`                            |
| richtext     | `richtext` (Plate/Slate) **and** `markdown` (Slate) | `richtext` (Lexical + Portable Text)          |
| unit tests   | 108 files, jest 27                                  | 476 files, vitest                             |
| e2e          | ~40 cypress specs, backend-parametrized             | 13 Playwright specs                           |
| React peer   | ^19.1.0                                             | ^19.0.0                                       |

Three facts that shaped everything below:

1. **Upstream already ships a `richtext` widget.** `decap-cms-widget-richtext@3.5.0`, Plate-based,
   alongside `markdown`. Commit `157d869d9` in this fork dropped _both_ and replaced them with
   Lexical. So "remove the Lexical editor from the RC" leaves the RC with no rich-text editing at
   all unless the Plate widget is ported back in.
2. **Cherry-picking cannot converge history.** A cherry-pick creates a new SHA; the merge base stays
   at `6ef2f9bdf` regardless. Only a real merge moves it.
3. **Upstream's cypress suite cannot pass against this tree.** It selects on Emotion display-name
   fragments (`button[class*=TopBarButton-button]`, `div[class*=NestedObjectLabel]`,
   `ul[class*=ControlErrorsList]`). Those names come from `decap-cms-ui-default`; `src/ui/` is a
   292-file Base UI rewrite with none of them. Not "needs porting" - structurally cannot pass.

## Decisions

### D1 - History converges via `-s ours`, not cherry-picks

`git merge -s ours <PIN>` on `main`. Records upstream's 70 commits as ancestors without touching a
file; divergence becomes N/0 immediately.

`-s ours` **lies** - it claims those 70 commits are incorporated when the tree is untouched.
Anything not hand-ported afterwards is lost silently and git will never offer it again. The
~33-commit port checklist (below) is therefore a **hard gate**, not an intention.

Rejected: a real `git merge` (conflicts across ~every moved path, days of work, most discarded);
cherry-picking (never converges, repeats the triage on every future sync).

### D2 - The RC ships upstream's Plate richtext; Lexical stays out

Lexical is not yet stable enough to hand to decaporg. The RC's `richtext` slot is filled by porting
`decap-cms-widget-richtext@3.5.0` onto the new core.

This is **not a copy** - it is 70 `.js` files with Immutable in 10 of them (`RichtextControl.js`,
`VisualEditor.js`, `RawEditor.js`, `Toolbar.js`, `ShortcodeElement.js`,
`EditorComponentsToolbarButton.js`, `RichtextPreview.js`, serializers, tests), rewritten to
TypeScript against `CmsWidgetControlProps` with plain objects.

Rejected: Lexical wins (unstable, and would owe parity against both v3 widgets); ship both (three
rich-text widgets in a tree whose maintainers are already short on bandwidth).

### D3 - `registerEditorComponent` returns, owned by the widget

Plate's shortcode support _is_ `editor_components`, so D2 forces the API back. It lands as a
widget-owned registry with a thin passthrough in `core/lib/registry.tsx` - the shape already proven
there by `registerBlock` / `registerRichtextFormat`, which store nothing and delegate to
`lib/richtext`.

`src/__tests__/registerEditorComponent-removed-api-doc-pin.test.ts` must be relaxed: `window.CMS` is
assembled in core, so the _name_ has to appear there even though the semantics do not.

Rejected: restore it fully in core (undoes a deliberate core decision); ship without shortcodes
(breaks a documented v3 extension point, straight through the parity claim).

### D4 - Portable Text and format packs stay out of the RC

`lib/richtext/` (54 files) and `format-packs/` (html, markdown, mdx, plaintext) remain on this
fork's `main` only. The ported Plate widget reads and writes markdown strings, as upstream's does.

Consequences in core: `registerBlock`, `registerRichtextFormat`, and `registerBlockComponents` come
out, along with the `lib/richtext` coupling in `HintMarkdown.tsx` and `PreviewHOC.tsx`.

Known cost: v4's richtext is architecturally identical to v3's, so landing Lexical later needs a
second breaking change. Accepted deliberately - it keeps the RC small and reviewable.

Rejected: RC keeps PT and the Plate port targets it (turns a port into a reimplementation, and every
round-trip bug becomes a v4 data-integrity bug on other people's repos); ship PT dormant (54 files
of unconsumed code is unreviewable).

### D5 - The RC branch keeps full ancestry

`v4-beta` branches from `main` after the D1 merge. Because that merge makes `main` a descendant of
decaporg's history, the branch is ancestrally connected to their tree - so merges flow both ways
afterwards, with real merge bases and no manual triage.

**This must be put to decaporg explicitly, not assumed.** It asks them to absorb 1004 commits
carrying Laika references, DCMS ticket IDs, and the Lexical/PT development trail for code that isn't
in the RC. Some maintainers will balk. If they insist on a squash, every future sync in both
directions becomes permanent manual cherry-picking.

### D6 - One package; the other 40 npm names are deprecated

v4 publishes `decap-cms` alone. The remaining 40 get `npm deprecate` pointing at v4 subpaths.

Every third-party widget peer-depends on `decap-cms-app` and imports styled primitives from
`decap-cms-ui-default`; every custom backend imports `decap-cms-lib-util`. All of them need a code
change to work on v4.

Rejected: shim the load-bearing five as thin re-export packages (cheaper for the ecosystem, but
`decap-cms-ui-default`'s surface largely does not survive the `ui/` rewrite, so the shims would
forward exports that no longer exist); un-flatten the monorepo (discards the restructure, which is
most of what is being contributed).

**This is the decision most likely to be reversed by decaporg.** See D13.

### D7 - Parity contract: negotiated checklist, proven by a scoped spec port

Since upstream's cypress suite cannot run (ground truth #3), parity is defined by a written
checklist agreed with decaporg, and evidenced by ~12-15 cypress specs ported to Playwright against
the new DOM, reusing their recorded fixtures with selectors rewritten to `data-testid`:

- `e2e/common/entries.js`, `editorial_workflow.js`, `media_library.js`, `i18n.js`
- `e2e/field_validations_spec.js`
- the `richtext_widget_*` set

The eight `markdown_widget_*` specs are explicitly skipped - that widget is gone by agreement.

### D8 - Immutable removal is documented, not trapped

`breaking-changes-v4-beta.md` gets the missing entry plus a migration section. No runtime detection.

The break is wide and quiet: `CmsPreviewTemplateComponentProps.entry` and
`CmsWidgetControlProps.field` are plain objects, so every documented `entry.getIn(['data','title'])`
and every third-party `field.get('name')` yields `undefined` or throws into user code without naming
the cause. Stacked on D6, a widget author faces four simultaneous breaks: package name, import path,
`field.get(x)` -> `field.x`, and value shape.

Rejected: a dev-only `Proxy` throwing a self-explaining error on `get`/`getIn`/`toJS`/`setIn` (~30
lines, converts the worst failure mode into an actionable message - reconsider if support load
becomes decaporg's stated objection); a codemod (`.get()` on a plain object is indistinguishable
from `.get()` on a Map without type info).

**Independent of this merge: the missing entry is a bug in the doc today.** Fix it on `main` either
way.

### D9 - Only the richtext specs gate the RC

Items D1-D6 move existing, working code; 476 unit tests plus review cover them. The Plate port is
the exception - it is code that has never existed and never run, and upstream ships
`richtext_widget_*` specs that test exactly it. Those port before the branch goes out. The rest of
D7's spec list is post-acceptance.

### D10/D11 - The strip is one rebased commit, guarded on the return path

`main` keeps `laika-app/` and Lexical: clients already depend on `@laikacms/decap-cms`'s
`./laika-app` and `./lib/richtext/lexical` subpaths, so extracting them to separate packages would
itself be a breaking change on a shipped package.

So the strip is a **deletion on `v4-beta`**, and it is exactly **one commit at the tip**:

```
main ─── (D1 merge) ─┬─ ...main continues (laika, lexical)
                     └─ v4-beta: [rename] [strip] [plate port] [ported specs]
```

Syncing before acceptance is `git rebase --onto main` - one commit is the whole conflict surface.
Modify/delete conflicts are tree-level, so no `.gitattributes` merge driver can suppress them; this
is why the strip is isolated rather than spread.

**After acceptance, run `git merge -s ours decaporg/v4-beta` into `main` once.** Without it, the
strip commit is an ancestor of their branch, and the first real merge of their fixes will propose
deleting `laika-app` and Lexical from the package this fork's clients ship.

The rename (`@laikacms/decap-cms` -> `decap-cms`, 30 export paths plus docs and tests) is its own
commit _before_ the strip, so the strip stays a pure deletion and rebases mechanically.

### D12 - Parity is pinned to one SHA

Parity target and the D1 merge target are **the same commit**, written down in whatever is agreed
with decaporg. Anything landing upstream after the pin is post-merge work tracked as issues on
`v4-beta`, not a merge blocker.

Upstream shipped `2b772c789` (browser image transformations) days before this plan was written -
their main is live, and an unpinned "parity with decaporg/main" is a target that recedes every time
they merge a PR. If the pin and the merge SHA differ, the port checklist and the parity checklist
drift apart.

Ask, but do not require: route new features to `v4-beta` once it exists, so nobody ports twice.

### D13 - Build first; no upfront RFC

The RC gets built and the decisions are reviewed as code.

**Accepted risk, stated plainly.** Five of the decisions above are not local technical calls - D6
(orphaning 40 package names), D8 (Immutable), the `ui/` rewrite, D3 (shortcode semantics), and D2/D4
(Decap's richtext roadmap). decaporg agreed to "a breaking v4 with feature parity"; that sentence
does not obviously authorize any of them. If D6 reverses after the work is done, the strip, the
shims, and the migration guide all change. D11's rebase cadence runs the whole time.

### D14 - Review is behavioral, with code review scoped to what can hurt people

426,000 lines across 2,646 files will not be line-reviewed. The functional argument is carried by
D7's checklist, D9's specs, and a running demo. Line-by-line review is scoped to where a rewrite can
introduce a **vulnerability** rather than a bug:

- `backends/` - auth flows, token handling, PKCE
- `lib/auth`
- sanitization paths (note
  `ecfd9853 Sanitize HTML links and images, enhance proxy URL validation
  (#7791)` is inside the
  port checklist)

**Obligation this creates:** run that security review internally first and hand decaporg the
findings. Asking maintainers to be the only line of defense on 108 files of rewritten backend code
is something they would be right to refuse.

## The port checklist (D1's hard gate)

Of the 70 commits in `HEAD..upstream/main`, ~37 are dependabot bumps, `chore(release): publish`, or
lockfile churn against a build system this fork replaced. Ignore those. The rest, grouped by how
they port:

**Already present - verify, do not port**

- `78c079313` uuid widget (#6675) - `widgets/uuid` exists
- `543af4f96` `crypto.randomUUID()` (#7846) - already used in reducers
- `1b52b90d3` Forgejo/Codeberg backend (#7726) - `backends/forgejo` exists; **verify editorial
  workflow support specifically**
- `14c5d5183` React new JSX runtime (#7876) - verify

**Subsumed by the D2 port - port the widget from the pin, not these individually**

- `8f23db0f9` preserve block images in list items (#7896)
- `f8c947c90` break nodes on shift+enter (#7817)
- `9db5e1ed2` invalid imports, widget types, paste handling (#7803)

**Behavioral equivalence in `src/ui/`, not a code port** (these touch `decap-cms-ui-default`, which
no longer exists here)

- `11f35405c` responsive collections and workflow views (#7827)
- `3c3fd819f` responsive media library (#7820)
- `64118e404` responsive app header (#7825)
- `2fdf79841` responsive dropdown positioning (#7828)
- `825f3d8e4` remove padding from group-by headings (#7866)

**Genuinely missing - real work**

- `03d6446d5` Collaborative Notes Pane (#7563) - no `EditorNotesPane` in this tree
- `40c4ac0d5` collection size limit (#7451) - no `size_limit`/`sizeLimit`
- `2b772c789` browser image transformations (#7845)

**Port**

- `ecfd9853` Sanitize HTML links and images, proxy URL validation (#7791) - **security, prioritize**
- `a82d93578` git-gateway: restore PKCE session on page reload (#7934)
- `18be93a85` gitlab: refresh expired PKCE access tokens (#7854)
- `d7bef8984` gitlab: Bearer auth for GraphQL requests (#7855)
- `c76586b15` gitlab: load lfs media content (#7815)
- `78fb8af5d` nested collection bugs (#7681)
- `2f5c54d96` separator and sorting for unpublished entries (#7624)
- `f8de615a5` populate relation widget from url (#7806)
- `344c65449` `pattern` can be a RegExp (#6794)
- `25db74b71` filters in slug template strings (#6690)
- `17fb6306d` include slug and path in result (#7436)
- `5be1d7aac` React bad `setState()` warnings (#7416)
- `0e82bc5fb` unify "New entry" button label across locales (#7842)
- `eaace6427` Slovak locale (#7844)
- `0a5e6f933` Croatian and Serbian locales (#7829)
- `2e6062381` remove frontmatter `draft` from dev-test (#7865)
- `bfe0dfd65` flaky/failing test fixes (#7951) - port intent, suite differs
- `d8436e6a2` react-toastify version incompatibility (#7914) - verify against this fork's version

## Sequence

**Phase 1 - on `main`**

1. Pin the SHA. Write it down (D12).
2. Port the checklist above. **Complete before step 3** - after the `-s ours` merge, git will never
   surface these again.
3. `git merge -s ours <PIN>` (D1).
4. Add the Immutable entry to `breaking-changes-v4-beta.md` (D8) - worth doing regardless.

**Phase 2 - cut `v4-beta`**

5. Branch from `main` (D5).
6. Commit: rename `@laikacms/decap-cms` -> `decap-cms`, version `4.0.0-beta.0` (D11).
7. Commit: **the strip** - `laika-app/`, `backends/laika`, `widgets/richtext` (Lexical),
   `lib/richtext`, `format-packs`, the core PT hooks, laika references in `ui/` and `ui/default`.
   One commit (D10/D11).
8. Commits: the Plate port (D2) + `registerEditorComponent` widget-side registry (D3).
9. Commit: `dist/decap-cms.js` alias and a `main` field, or every
   `<script src=".../dist/decap-cms.js">` install 404s and `require('decap-cms')` fails.
10. Commits: the `richtext_widget_*` Playwright specs - **gate** (D9).
11. Internal security review of `backends/`, `lib/auth`, sanitization (D14).

Rebase steps 6-11 onto `main` as it moves (D11).

**Phase 3 - propose**

12. Push `v4-beta`, propose D5 (branch with ancestry) and D14 (scoped review) explicitly.
13. Negotiate the D7 parity checklist against the pin.

**Phase 4 - after acceptance**

14. `git merge -s ours decaporg/v4-beta` into `main` **once** (D11) - protects clients.
15. Remaining D7 spec ports.
16. Migration guide for widget and preview-template authors.
17. `npm deprecate` on the 40 names, post-publish (D6).

## Where this fails

**The Plate port (D2).** Everything else moves working code. That widget is new code, on a rewritten
core, replacing a better editor, and it is the piece with the least motivation behind it and no
prior test coverage. D9 gates on its specs for exactly this reason.

**D6 reversing late.** D13 means the ecosystem decisions get litigated after the work exists.

**D5 refused.** If decaporg squashes instead of taking the branch, the divergence stops shrinking
and every sync becomes manual, permanently - the outcome D1 was chosen to avoid.

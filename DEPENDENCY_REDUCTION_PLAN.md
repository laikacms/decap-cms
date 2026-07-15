# Dependency Reduction Plan

## Purpose

Reduce the browser bundle size and software-supply-chain exposure of
`@laikacms/decap-cms` while preserving its public API and CMS behavior.

This plan addresses two related but distinct costs:

1. **Runtime cost**: JavaScript downloaded, parsed, and executed by applications importing
   `@laikacms/decap-cms/laika-app` or `@laikacms/decap-cms/laika-app/bare`.
2. **Install-time exposure**: packages installed for every consumer, including dependencies for
   server entry points, optional media integrations, and widgets that an application does not use.

The work should favor removal, platform APIs, and small local utilities over replacing one external
dependency with another.

## Scope

Included:

- Production dependencies declared by `@laikacms/decap-cms`.
- Direct and transitive dependencies used by browser, backend, server, widget, and media entry
  points.
- The composition of `laika-app` and `laika-app/bare`.
- Package boundaries and extension-loading behavior.
- Build-time checks that prevent dependency and bundle-size regressions.

Temporarily excluded because they are being changed separately:

- `src/widgets/richtext/**`
- `src/lib/richtext-lexical/**`

Do not remove a dependency used by either excluded directory until the owner of that work confirms
it is safe. Re-baseline the package after that work is merged.

## Baseline

The initial audit used committed `HEAD` on 2026-07-14, rather than the dirty working tree containing
the concurrent rich-text work.

Browser builds were minified with esbuild and measured without source maps:

| Entry point | Minified JavaScript | Gzip |
| --- | ---: | ---: |
| `laika-app` | 5.52 MB | 1.71 MB |
| `laika-app/bare` | 1.65 MB | 515 KB |
| Eager extension difference | 3.88 MB | 1.20 MB |

The package currently exposes roughly 100 direct production dependencies and resolves roughly 538
production package snapshots. Exact counts will change as the lockfile changes.

These figures are reference measurements, not permanent budgets. Before implementation begins:

- Merge or otherwise settle the concurrent rich-text work.
- Build both entry points from a clean checkout.
- Record raw, minified, gzip, and Brotli sizes.
- Save bundle visualizer/metafile output as a CI artifact.
- Record direct dependency count, total production package count, and packed package size.

## Desired outcomes

The program is complete when:

- Applications can choose a small, explicit set of backends, widgets, and locales without pulling
  the default extension set into their browser bundle.
- Browser-only consumers do not install server-only and unrelated integration dependencies.
- Unused and redundant direct dependencies have been removed.
- Tiny, low-complexity dependencies with narrow usage have been replaced by tested local code.
- Browser code no longer depends on Node polyfill aliases for repository paths or hashing.
- Bundle and dependency-graph budgets run in CI.
- Package-boundary changes have migration documentation and a compatibility period.

## Decision rules

Evaluate every dependency against the same criteria:

1. **Reachability**: Is it present in `laika-app`, `laika-app/bare`, or only a subpath export?
2. **Exclusive closure**: How many packages disappear if it is removed?
3. **Replacement complexity**: Can the used behavior be described and tested in a small amount of
   local code?
4. **Correctness risk**: Does it implement parsing, accessibility, cryptography, internationalized
   date handling, or other deceptively complex behavior?
5. **Maintenance health**: Consider release history, ownership, repository activity, provenance,
   and ecosystem governance. Maintainer count alone is not sufficient.
6. **Platform availability**: Prefer stable browser or JavaScript APIs such as
   `IntersectionObserver`, `ResizeObserver`, Web Crypto, and immutable array operations.
7. **Elimination test**: Do not inline a direct callsite if the dependency remains reachable through
   another package unless the local change still improves the interface or enables later removal.

Avoid locally reimplementing full parsers, schema validators, cryptographic algorithms, or complex
accessibility primitives merely to reduce the dependency count.

## Phase 1: Remove unused and redundant declarations

This phase should be mechanical and split into small commits. For each dependency, delete it,
regenerate the lockfile, run the full verification suite, and confirm the packed manifest.

- [ ] Remove `redux-notifications`; no runtime imports were found.
- [ ] Remove `copy-text-to-clipboard` and its stale ambient declaration; no runtime import was found.
- [ ] Remove the direct `codemirror` declaration if `@uiw/react-codemirror` remains its only owner.
- [ ] Remove the direct `node-polyglot` declaration if `react-polyglot` remains its only owner.
- [ ] Remove the direct `prop-types` declaration if no public entry point imports it.
- [ ] Confirm whether `@emotion/css` is needed by the concurrent rich-text work; otherwise remove it.
- [ ] Check every production dependency with no direct import and document why it is intentionally
  retained, moved, or removed.

Expected result:

- No browser behavior change.
- A smaller lockfile and install graph, particularly from removing the obsolete
  `redux-notifications` subtree.
- Every retained direct dependency has an identifiable owner and entry point.

## Phase 2: Inline genuinely small utilities

Each replacement must first capture the currently used semantics in tests. Keep helpers narrow and
local; do not recreate a general-purpose package API.

### `array-move`

- [ ] Add tests for forward movement, backward movement, negative indices if currently relied upon,
  missing items, and input immutability.
- [x] Replace the single file-widget callsite with a local immutable reorder helper.
- [x] Remove `array-move` and regenerate the lockfile.

This is the highest-confidence inline candidate: its used behavior is a copied array and two splice
operations.

### `fuzzy`

- [ ] Capture backend and media-search ranking behavior in characterization tests.
- [ ] Implement only the subsequence matching and result ordering the CMS uses.
- [ ] Ensure ties retain deterministic input order.
- [ ] Remove `fuzzy`.

### `common-tags`

- [ ] Add whitespace-focused tests for all templates using `oneLine` and `stripIndent`.
- [ ] Implement those two template helpers locally.
- [ ] Remove `common-tags` and its type package.

### `deepmerge`

- [ ] Inventory the actual configuration value shapes passed to `deepmerge`.
- [ ] Add tests for nested objects, arrays, `undefined`, and non-plain values.
- [ ] Inline a configuration-specific merge only if the supported semantics are demonstrably small.
- [ ] Otherwise retain `deepmerge` and document why.

Expected result:

- Several small external trust relationships removed.
- Approximately 70 KB of reachable source removed before minification, primarily from
  `common-tags`.
- No generic local utility framework introduced.

## Phase 3: Replace small React wrappers and old transitive leaves

### Progress indicator

- [ ] Replace `react-topbar-progress-indicator` and its `topbar` dependency with an internal
  component and CSS.
- [ ] Test navigation start, completion, repeated navigation, reduced motion, and unmount cleanup.

### Viewport detection

- [ ] Replace the two `react-waypoint` usages with a shared `IntersectionObserver` hook.
- [ ] Provide a small fallback for environments without `IntersectionObserver` if tests or supported
  browsers require it.
- [ ] Remove `react-waypoint` and its `consolidated-events` subtree.

### Redux DevTools

- [ ] Replace deprecated `redux-devtools-extension` usage with the maintained API or a guarded
  browser DevTools compose hook.
- [ ] Confirm production builds do not include development-only code.

Expected result:

- Old packages such as `topbar` and `consolidated-events` leave the graph.
- CMS behavior relies more directly on supported browser primitives.

## Phase 4: Replace dependency clusters with disproportionate cost

These changes require dedicated behavior and accessibility testing and should not be combined with
the mechanical cleanup phases.

### Accessible menu button

`react-aria-menubutton` pulls old, small transitive packages including `focus-group` and
`teeny-tap`.

- [ ] Define the complete dropdown interaction contract.
- [ ] Test keyboard navigation, focus return, escape, outside click, disabled items, screen-reader
  labels, and nested interactive content.
- [ ] Implement an internal component or choose a dependency already used by the CMS.
- [ ] Remove `react-aria-menubutton` only after accessibility parity is demonstrated.

### Color widget

`react-color` and `tinycolor2` contribute a comparatively large dependency cluster for one widget.

- [ ] Document the color formats, alpha behavior, validation, and browser support required by the
  widget.
- [ ] Prototype a focused internal UI based on native color input plus explicit text/alpha controls.
- [ ] Compare usability and accessibility with the current widget.
- [ ] Remove both dependencies only if all required formats remain supported.

### Node polyfills in browser code

- [ ] Replace Git repository use of `path.dirname` with a tested POSIX repository-path helper.
- [ ] Remove the `path-browserify` alias and dependency.
- [ ] Replace browser-externalized Node `crypto` usage in blob hashing with Web Crypto or another
  browser-native implementation.
- [ ] Remove the unused `buffer` alias and dependency after clean browser builds confirm it is safe.
- [ ] Add a build check that fails on browser externalization of Node built-ins.

Expected result:

- Fewer compatibility shims and fewer old transitive packages.
- A browser bundle that is explicit about its runtime rather than relying on accidental polyfills.

## Phase 5: Make extension composition explicit

The default `laika-app` eagerly registers every backend, widget, editor component, and locale.
`laika-app/bare` avoids that registration but still imports the complete core and Laika shell.

Introduce supported presets or extension packs, for example:

- `extensions/standard-widgets`
- `extensions/github`
- `extensions/git-gateway`
- `extensions/all-backends`
- `extensions/code-widget`
- `extensions/map-widget`
- locale-specific exports such as `locales/en`

Tasks:

- [ ] Define the smallest supported Laika application composition.
- [ ] Add a preset containing the common Laika production configuration.
- [ ] Keep a compatibility entry that registers everything for existing users.
- [ ] Ensure extension modules have no registration side effects until explicitly imported or
  invoked.
- [ ] Export locales individually rather than through an eager locale namespace.
- [ ] Add example applications for the full, recommended, and minimal compositions.
- [ ] Measure every supported composition independently.

The full compatibility build may remain large; the important outcome is that it is no longer the
only convenient path.

## Phase 6: Reduce the `bare` core

The initial `bare` bundle is approximately 515 KB gzip because core still eagerly reaches schema
validation, configuration parsing, Markdown/frontmatter processing, Redux/router infrastructure,
legacy UI, and drag-and-drop code.

Treat these as separate investigations:

- [ ] Generate a source-map/metafile breakdown of `bare` after phases 1–5.
- [ ] Identify modules imported only to populate global registries or broad barrel exports.
- [ ] Move configuration parsing and validation behind the bootstrap path that needs them.
- [ ] Separate headless registry/state APIs from the default React shell where practical.
- [ ] Check whether broad reexports in `laika-app/bare` prevent effective tree-shaking.
- [ ] Test whether application-specific entry points can omit editor, media, and workflow surfaces.

### Lodash migration

Lodash is widely used: the initial audit found roughly 158 imports across 68 non-rich-text files.
Do not attempt a single wholesale rewrite.

- [ ] Establish the minified and gzip contribution using a reproducible bundle experiment.
- [ ] Group imports by operation and frequency.
- [ ] Replace trivial language operations with native JavaScript when semantics are identical.
- [ ] Benchmark `lodash-es` or explicit ESM operation imports before adopting them.
- [ ] Preserve complex operations where a local rewrite would be less readable or less reliable.
- [ ] Remove `lodash` only when no public runtime path depends on it.

## Phase 7: Split install-time trust boundaries

Subpath exports improve import ergonomics and tree-shaking, but they do not stop package managers
from installing every dependency in a single package. Create separate installable packages for
features with distinct runtimes or ownership.

Proposed package boundaries:

- `@laikacms/decap-cms-core`: browser-safe core and public contracts.
- `@laikacms/decap-cms-app`: React application shell and standard lightweight widgets.
- `@laikacms/decap-cms-server`: Express, logging, Git process, and server-only dependencies.
- `@laikacms/decap-cms-widget-code`: CodeMirror and language modes.
- `@laikacms/decap-cms-widget-map`: OpenLayers.
- `@laikacms/decap-cms-media-uploadcare`: Uploadcare widget and effects.
- Backend packages or backend groups where their exclusive closures justify the boundary.

The exact names are provisional. Choose boundaries using dependency closure and runtime ownership,
not one package per source directory.

Tasks:

- [ ] Generate an exclusive transitive-closure report for every direct dependency.
- [ ] Design public contracts that prevent core from importing implementations.
- [ ] Keep internal dependencies on `workspace:*` and shared versions on `catalog:`.
- [ ] Add compatibility reexports for one release cycle where practical.
- [ ] Mark breaking moves clearly and publish a migration table.
- [ ] Verify a browser-only installation does not install server, Uploadcare, OpenLayers, or
  CodeMirror packages unless selected.
- [ ] Avoid relying on `optionalDependencies` as the primary boundary because they are commonly
  installed by default.

Expected result:

- Tree-shaking controls runtime bytes.
- Package boundaries control install-time packages and trusted publishers.
- Consumers opt into heavy integrations explicitly.

## Phase 8: Continuous dependency governance

Add automated evidence so the package does not slowly return to its current shape.

- [ ] Create a script that reports direct dependencies with no source imports.
- [ ] Record total production package count and exclusive closure per direct dependency.
- [ ] Add size-limit checks for full, recommended, minimal, and bare browser builds.
- [ ] Upload bundle analysis artifacts in CI for pull requests that change dependencies or entry
  points.
- [ ] Fail browser builds that externalize Node built-ins unexpectedly.
- [ ] Run vulnerability audits and license checks in CI.
- [ ] Review lockfile changes as code, including new package owners, lifecycle scripts, repository
  provenance, and exclusive transitive cost.
- [ ] Prefer exact lockfile-controlled versions and trusted publication provenance; do not use
  maintainer count as the sole risk signal.
- [ ] Add a dependency decision note to pull requests that introduce a new production package.

Suggested pull-request questions:

1. Which entry point owns this dependency?
2. Does it enter a browser bundle, and by how much?
3. How many exclusive transitive packages does it add?
4. Why is a platform API or local implementation inappropriate?
5. What is the package's maintenance and publication model?
6. Can the feature live in a separately installed integration package?

## Verification gates

Every dependency-removal pull request should run:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:laika-demo
pnpm build:laika-bare-demo
pnpm pack --dry-run
```

Also verify, as relevant:

- Full and minimal browser smoke tests.
- Keyboard and screen-reader interaction tests for replaced UI primitives.
- Configuration compatibility fixtures for merge/parser changes.
- Browser tests without Node global/polyfill injection.
- Bundle-size comparison against the recorded baseline.
- Production dependency count and exclusive-closure comparison.

## Commit strategy

Keep the history reversible and make size/supply-chain effects attributable:

1. Add characterization tests for one dependency.
2. Replace that dependency without unrelated cleanup.
3. Remove it from the manifest and regenerate the lockfile in the same commit as the replacement,
   unless the test commit is useful independently.
4. Record before/after bundle and graph measurements in the pull request.
5. Do not combine package-boundary migrations with behavioral widget rewrites.

Good initial commit sequence:

1. Remove unused `redux-notifications`.
2. Remove unused clipboard dependency and declaration.
3. Remove redundant direct dependency declarations.
4. Replace `array-move`.
5. Replace `fuzzy`.
6. Replace the two `common-tags` helpers.
7. Replace the progress indicator.
8. Replace Waypoint with `IntersectionObserver`.
9. Remove Node path and buffer polyfills.
10. Introduce the first explicit lightweight extension preset.

## Risks

- Bundle attribution from source maps is directional, not an exact statement of minified bytes.
- Replacing a dependency can increase local maintenance cost even when it decreases package count.
- Accessibility regressions are more serious than dependency-count improvements.
- Package splitting creates release and version-coordination overhead.
- Side-effectful registry imports can defeat tree-shaking if extension initialization is not
  redesigned.
- Concurrent rich-text work can invalidate dependency ownership conclusions from the initial audit.

Mitigate these risks with characterization tests, isolated commits, reproducible measurements, and
a compatibility period for public package changes.

## First milestone

The first milestone should contain phases 1 and 2 plus measurement automation. It should not change
package boundaries or widget behavior beyond the narrowly tested utility replacements.

Milestone acceptance criteria:

- All unused and redundant direct declarations are resolved or explicitly documented.
- `array-move`, `fuzzy`, and the used `common-tags` helpers have been evaluated and replaced where
  characterization tests show it is safe.
- CI records the four bundle size formats and production dependency count.
- The full test/build/pack verification suite passes.
- No changes are made inside the temporarily excluded rich-text directories.

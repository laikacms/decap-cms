# Dependency Reduction Plan

## Purpose

Reduce the browser bundle size and software-supply-chain exposure of `@laikacms/decap-cms` while
preserving its public API and CMS behavior.

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

The temporary rich-text exclusion (formerly `src/widgets/richtext/**` and the old
`src/lib/richtext-lexical/**` tree) is lifted as of 2026-07-15: the Lexical work has merged, and
rich-text now lives in `src/widgets/richtext`, `src/lib/richtext`, and `src/ui/editor`. Its
re-baseline trigger has fired; see the Baseline section.

## Baseline

The initial audit used committed `HEAD` on 2026-07-14, rather than the dirty working tree containing
the concurrent rich-text work.

Browser builds were minified with esbuild and measured without source maps:

| Entry point                | Minified JavaScript |    Gzip |
| -------------------------- | ------------------: | ------: |
| `laika-app`                |             5.52 MB | 1.71 MB |
| `laika-app/bare`           |             1.65 MB |  515 KB |
| Eager extension difference |             3.88 MB | 1.20 MB |

At that audit `HEAD` the package exposed 110 direct production dependencies and resolved roughly 538
production package snapshots. These measurements predate both the Lexical merge and the v4.beta
dependency overhaul; as of 2026-07-15 the working tree is down to 78 direct production dependencies,
and the bundle figures above no longer describe the current tree.

These figures are historical reference measurements, not permanent budgets. The re-baseline this
section calls for is now due:

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
5. **Maintenance health**: Consider release history, ownership, repository activity, provenance, and
   ecosystem governance. Maintainer count alone is not sufficient.
6. **Platform availability**: Prefer stable browser or JavaScript APIs such as
   `IntersectionObserver`, `ResizeObserver`, Web Crypto, and immutable array operations.
7. **Elimination test**: Do not inline a direct callsite if the dependency remains reachable through
   another package unless the local change still improves the interface or enables later removal.

Avoid locally reimplementing full parsers, schema validators, cryptographic algorithms, or complex
accessibility primitives merely to reduce the dependency count.

### Accessible menu button

### Node polyfills in browser code

- [ ] Replace Git repository use of `path.dirname` with a tested POSIX repository-path helper. One
      call site remains: `src/backends/github/API.tsx`.
- [x] Replace browser-externalized Node `crypto` usage in blob hashing with Web Crypto or another
      browser-native implementation. `src/lib/util/getBlobSHA.ts` uses Web Crypto with a guarded
      Node fallback behind a dynamic import.
- [x] Remove the unused `buffer` alias and dependency after clean browser builds confirm it is safe.
      Removed in the v4.beta dependency overhaul; no polyfill aliases remain in the Vite configs.
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

Lodash is widely used: 159 imports across `src/` as of 2026-07-15, almost all already per-method
(`lodash/get` style). The known leaks: seven files import from the full `lodash` package (which
defeats consumer tree-shaking in the unbundled `dist/`), `src/default-exports/index.ts` re-exports
all of lodash as public API (the blocker for full removal), and three inherited files use
`lodash/fp/*` imports. Do not attempt a single wholesale rewrite.

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
- `@laikacms/decap-cms-server`: the `node:http` dev/proxy server and any server-only dependencies
  (Express is gone; winston is a type-only devDependency).
- `@laikacms/decap-cms-widget-code`: CodeMirror and language modes.
- `@laikacms/decap-cms-widget-map`: OpenLayers.
- `@laikacms/decap-cms-media-uploadcare`: Uploadcare widget and effects.
- Backend packages or backend groups where their exclusive closures justify the boundary.

The exact names are provisional. Choose boundaries using dependency closure and runtime ownership,
not one package per source directory.

Partially delivered ahead of this phase: `uploadcare-widget`, `uploadcare-widget-tab-effects`, `ol`,
and the Apollo/GraphQL stack are now optional `peerDependencies`, so consumers no longer install
them by default. CodeMirror remains a direct dependency cluster.

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

Mitigate these risks with characterization tests, isolated commits, reproducible measurements, and a
compatibility period for public package changes.

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

# Upstream sync ledger

Porting decaporg/decap-cms `main` into this branch. Fork point `6ef2f9bdf` (2026-04-22). First sync up to `1d5868347` (2026-09-22), second sync up to `61ceb6e06` (2026-10-28). One row per upstream commit, oldest first within each sync. Each port is its own commit with a `Ported-from: decaporg/decap-cms@<sha> (#PR)` trailer.

Statuses: `todo` · `done` · `ported-by-laika` (already on v4-beta before this sync) · `verify` (probably nothing to port; confirm) · `dep-check` (confirm v4's version is at least this new) · `n/a` (doesn't apply to v4) · `skip` (decided against) · `ask` (needs a decision).

## Decisions (2026-10-06)

- Generic preview fallback: restored.
- Built-in Image editor component: restored.
- README: Decap Turbo, sponsors and expert services sections added.
- Notes pane: yes. Markdown inline editor components (#7958): no.

## Needs a real-backend check

- `1f6f71c23`: Bitbucket token refresh through Netlify auth.
- `cec9441e1`: GitLab PKCE refresh on an expired token: REST verified 2026-10-07 (401 → `oauth/token` → retry, new token stored); GraphQL still open (the tester doesn't set `use_graphql`).
- `a82d93578`: git-gateway PKCE session survives a reload.
- `59843046c`: Forgejo editorial workflow PR matching.
- ~~`03d6446d5`/`f269a8a4f`: notes~~ verified 2026-10-07 on GitLab and GitHub: read, add, edit, resolve, delete, a second quick note reuses the thread, others' notes read-only, polling picks up comments posted and edited on the host within one 15s cycle (so a comment edit does change GitHub's issue ETag), publish closes the thread with `entry-published` (GitHub creates the missing label), unpublish reopens it and drops the label, deleting a draft closes it with `entry-deleted`.

## v4 issues found along the way

- Fixed: choosing media in the library didn't fill file/image fields until something else re-rendered them (`52771896e`).
- Fixed: the shared combobox showed a blank band above every option list (with #7968).
- Fixed: deleting or unpublishing an i18n entry (multiple_files/multiple_folders) named every locale's file, and GitLab rejects a commit deleting a missing one, so an entry with an unfilled locale could not be deleted or unpublished (`72c5ad8f7`). Upstream main has the same bug.
- Fixed: a note just added on GitLab showed a placeholder instead of the editor's avatar (`d281a807a`).
- Fixed: the editor's floating view controls covered the notes pane's timestamps (`34efd1df9`); upstream has the same overlap.
- Fixed: every GitHub OAuth login failed with "Cannot read properties of undefined (reading 'token')": the auth page called `onLogin()` without the Netlify result (`33f23d719`). Regression from the v4 rewrite; PAT login was unaffected.
- Open (needs a decision): unpublish deletes the published files before it creates the draft, as upstream does. When creating the draft fails (on GitLab: a leftover `cms/<collection>/<slug>` branch with no open MR), the published entry is gone and no draft exists. Proposed: create the draft first, delete second.
- Open: while an existing entry loads, the editor briefly shows "Untitled", "Delete unpublished entry" and an empty notes pane before the entry arrives (GitLab tester).
- Open: opening an existing entry can show "UNSAVED CHANGES" straight away. The richtext widget re-serializes its markdown on mount, and a list nested in an object writes an empty richtext value to the wrong path before correcting it (Kitchen Sink entry). Same on untouched v4-beta.

## Second sync (2026-11-11): `1d5868347..61ceb6e06`

190 commits. Upstream merged its Decap Turbo line into `main` in this range (turbo-github and turbo-gitlab backends, `lib-turbo`, an S3 media library, the `decap` CLI and its dev proxy, plus core features built for it), which is most of the rows. The bug fixes and generic improvements are ported; everything Turbo is `ask` until the scope is decided. Several turbo-branch commits are rebased duplicates of first-sync rows (#7958, #7793, #7994, #7980, the reverted relation pair) and are marked as such.

Decisions (2026-11-11):

- Turbo: `lib-turbo`, the turbo-github and turbo-gitlab backends, the core hooks they need (backend `preloadConfig`, backend permissions, dead-session logout, `reloadEntriesAfterPersist`, server-side body search, signed-in user identity) and the experimental editor API / field actions: ported. The S3 media library: not ported.
- The `decap` CLI: ported as the sibling package `packages/decap` (`@decap/cli`, `private: true` for now); `decap dev` runs v4's dev server.
- Dependency bumps from #8030/#8046/#8051: not taken this sync (v4's dependencies were cleaned separately).

Still open: the deploy-status feature (save toasts, Deploys page, header indicator, turbo-github deploy watcher), rows marked `ask`.

Dependency versions upstream flagged, for reference: v4's lockfile still has versions upstream's #8030/#8046/#8051 flagged: `smol-toml` 1.7.0 (direct dependency, the TOML codec; fixed in 1.9.0), `trim` 0.0.1 (via `remark-parse` 6, bundled; fixed in 0.0.3), `fast-uri` 3.1.8 (<3.1.9), `js-yaml` 4.3.0 (<4.3.2), `undici` 7.28.0 (jsdom, tests only), `brace-expansion` 5.0.7 (eslint, dev only), and `simple-git` 3.36.0 (dev server; upstream moved to 4 for a critical advisory with no 3.x fix).

Deviations from upstream:

- `d3d40d1b3`: upstream also makes `entryExist` fail on anything but a 404. On v4 a missing file is reported differently per backend (test backend: plain Error, local-fs: DOMException, dev proxy: 500), so that rule would fail every create there. Needs not-found normalised across backends first.
- `9155f271e`: v4 keeps its key-based handling of `{{slug}}` in a collection path, so `{{slug | upper}}/index` stays upper case (upstream lowercases it again).
- `9324b482b`: the dev server now binds 127.0.0.1/::1 and only accepts localhost origins by default. Loading the admin UI from another host name now needs `BIND_HOST` and `ORIGIN` set.
- `f8e58aeea` (skip): the "is this entry in the workflow" shortcut, which needed three follow-up fixes upstream (`591c14591`, `ccdd71d30`, `efbd05279`); v4 keeps asking the backend per slug.

Not yet checked against a real backend: `b759e3b85` (GitLab MR sha on publish), `457398989`/`c779d90b1` (GitHub notes lookup by label), `e92641821` (Bitbucket paging), `7fbecd60b` (Azure user).

## Ledger

| Upstream | Date | PR | Title | Status | v4 commit | Notes |
|---|---|---|---|---|---|---|
| `9db5e1ed2` | 2026-05-05 | [#7803](https://github.com/decaporg/decap-cms/pull/7803) | fix(richtext): invalid imports, rich text widget types, improve paste handling (#7803) | ported-by-laika | ec72c45ec | came with the Plate richtext port (richtext@3.5.0) |
| `8b29297cd` | 2026-05-08 | [#7804](https://github.com/decaporg/decap-cms/pull/7804) | chore(deps-dev): bump axios from 1.15.0 to 1.16.0 (#7804) | n/a |  | v4 has it at least this new, or no longer uses it |
| `0a35acbe3` | 2026-05-08 | [#7805](https://github.com/decaporg/decap-cms/pull/7805) | chore(deps-dev): bump postcss from 8.5.6 to 8.5.14 (#7805) | done | 3c6db437c | lockfile refreshed past it |
| `517f13a86` | 2026-05-08 | [#7807](https://github.com/decaporg/decap-cms/pull/7807) | chore(deps): bump simple-git from 3.32.3 to 3.36.0 (#7807) | n/a |  | v4 has it at least this new, or no longer uses it |
| `3802f823e` | 2026-05-11 | [#7808](https://github.com/decaporg/decap-cms/pull/7808) | chore(deps): bump fast-uri from 3.1.0 to 3.1.2 (#7808) | done | 3c6db437c | lockfile refreshed past it |
| `d4d4cd4bb` | 2026-05-11 | [#7809](https://github.com/decaporg/decap-cms/pull/7809) | chore(deps-dev): bump @babel/plugin-transform-modules-systemjs (#7809) | n/a |  | v4 has it at least this new, or no longer uses it |
| `f8de615a5` | 2026-05-14 | [#7806](https://github.com/decaporg/decap-cms/pull/7806) | fix(#7794): populate relation widget from url (#7806) | ported-by-laika | bcdcb27f3 |  |
| `ecdcf9853` | 2026-05-14 | [#7791](https://github.com/decaporg/decap-cms/pull/7791) | Sanitize HTML links and images, enhance proxy URL validation (#7791) | ported-by-laika | 6f2f3cea5 |  |
| `17fb6306d` | 2026-05-14 | [#7436](https://github.com/decaporg/decap-cms/pull/7436) | feat: include slug and path in result (#7436) | ported-by-laika | 1e93fdb90 |  |
| `25db74b71` | 2026-05-15 | [#6690](https://github.com/decaporg/decap-cms/pull/6690) | feat(slugs): allow filters in template strings (#6690) | ported-by-laika | 59eaa6491 | cited as DCMS-1047, not the PR number |
| `5be1d7aac` | 2026-05-15 | [#7416](https://github.com/decaporg/decap-cms/pull/7416) | Fix(#7414): Fix React's bad setState() call warnings (#7416) | ported-by-laika | d6cc3e8bd |  |
| `78fb8af5d` | 2026-05-15 | [#7681](https://github.com/decaporg/decap-cms/pull/7681) | Fix bugs in nested collection (#7681) | ported-by-laika | 182c6b9e3 |  |
| `90f3a84e7` | 2026-05-15 |  | Add Decap Turbo to readme | done | 98577bbb8 | decision 2026-10-06; also ports the sponsors and expert services sections |
| `2fdf79841` | 2026-05-27 | [#7828](https://github.com/decaporg/decap-cms/pull/7828) | feat(ui): make dropdown positioning responsive (#7828) | n/a |  | Base UI menus keep themselves in the viewport (checked at 360px) |
| `64118e404` | 2026-05-27 | [#7825](https://github.com/decaporg/decap-cms/pull/7825) | feat(ui): make app header responsive (#7825) | ported-by-laika | 34698c68b |  |
| `ae01ad6f2` | 2026-06-01 |  | chore(release): publish | n/a |  | release commit |
| `b1073db51` | 2026-06-01 | [#7837](https://github.com/decaporg/decap-cms/pull/7837) | chore(deps): bump protocol-buffers-schema from 3.6.0 to 3.6.1 (#7837) | n/a |  | v4 has it at least this new, or no longer uses it |
| `e324a142f` | 2026-06-01 | [#7833](https://github.com/decaporg/decap-cms/pull/7833) | fix: remove unused dependencies and specify missing dependencies (#7833) | n/a |  | per-package dependency hygiene for the old monorepo |
| `e5e75cf70` | 2026-06-01 | [#7839](https://github.com/decaporg/decap-cms/pull/7839) | chore(deps): bump follow-redirects and mockserver-node (#7839) | n/a |  | v4 has it at least this new, or no longer uses it |
| `0a5e6f933` | 2026-06-01 | [#7829](https://github.com/decaporg/decap-cms/pull/7829) | feat: Croatian and serbian locale (#7829) | ported-by-laika | 1b88cfceb |  |
| `4197aaf9c` | 2026-06-01 | [#7819](https://github.com/decaporg/decap-cms/pull/7819) | chore(deps-dev): bump webpack-dev-server from 5.2.2 to 5.2.4 (#7819) | n/a |  | v4 has it at least this new, or no longer uses it |
| `c76586b15` | 2026-06-01 | [#7815](https://github.com/decaporg/decap-cms/pull/7815) | fix(gitlab): load lfs media content (#7815) | ported-by-laika | 29c8824c6 |  |
| `f8c947c90` | 2026-06-01 | [#7817](https://github.com/decaporg/decap-cms/pull/7817) | fix(richtext): create break nodes on shift + enter (#7817) | ported-by-laika | ec72c45ec | came with the Plate richtext port (richtext@3.5.0) |
| `344c65449` | 2026-06-02 | [#6794](https://github.com/decaporg/decap-cms/pull/6794) | pattern can be RegExp (#6794) | ported-by-laika | 36b7942d4 |  |
| `3c3fd819f` | 2026-06-01 | [#7820](https://github.com/decaporg/decap-cms/pull/7820) | feat(ui): make media library responsive (#7820) | ported-by-laika | 32a9e830a |  |
| `11f35405c` | 2026-06-01 | [#7827](https://github.com/decaporg/decap-cms/pull/7827) | feat(ui): make collections and workflow views responsive (#7827) | ported-by-laika | 2000e45f9 |  |
| `543af4f96` | 2026-06-08 | [#7846](https://github.com/decaporg/decap-cms/pull/7846) | refactor: use web standard `crypto.randomUUID()` instead of `uuid` package (#7846) | ported-by-laika | d11825b7a |  |
| `1c2cb42f2` | 2026-06-08 | [#7849](https://github.com/decaporg/decap-cms/pull/7849) | chore(deps): bump lodash from 4.17.23 to 4.18.1 (#7849) | n/a |  | v4 has it at least this new, or no longer uses it |
| `567a80101` | 2026-06-08 |  | chore(release): publish | n/a |  | release commit |
| `eaace6427` | 2026-06-09 | [#7844](https://github.com/decaporg/decap-cms/pull/7844) | feat(locales): add Slovak locale support (#7844) | ported-by-laika | c82687e5b |  |
| `ab397b96f` | 2026-06-11 | [#7853](https://github.com/decaporg/decap-cms/pull/7853) | chore(deps): bump shell-quote from 1.8.3 to 1.8.4 (#7853) | n/a |  | v4 has it at least this new, or no longer uses it |
| `d7bef8984` | 2026-06-12 | [#7855](https://github.com/decaporg/decap-cms/pull/7855) | fix(gitlab): use Bearer auth scheme for GraphQL requests (#7855) | ported-by-laika | 41939a814 |  |
| `0e82bc5fb` | 2026-06-12 | [#7842](https://github.com/decaporg/decap-cms/pull/7842) | feat(locales): unify "New entry" button label to "＋ %{collectionLabel}" across all locales (#7842) | ported-by-laika | e4d25f7ad |  |
| `18be93a85` | 2026-06-12 | [#7854](https://github.com/decaporg/decap-cms/pull/7854) | fix(gitlab): refresh expired PKCE access tokens (#7854) | ported-by-laika | fefd7959e |  |
| `8d83ac219` | 2026-06-12 | [#7856](https://github.com/decaporg/decap-cms/pull/7856) | chore: cleanup some old unused code (#7856) | n/a |  | none of the removed code or dependencies exist on v4 |
| `505b6a428` | 2026-06-15 |  | chore(release): publish | n/a |  | release commit |
| `03d6446d5` | 2026-06-17 | [#7563](https://github.com/decaporg/decap-cms/pull/7563) | Feature: Collaborative Notes Pane for the Editor screen (#7563) | done | 5941e825b, d6d6aa9c8, 98f0c1e36, 02b4980a3, ba7b02c99 | core, UI and test backend; GitLab and GitHub keep notes on a companion issue per entry; proxy backend left out (its server never had notes) |
| `333506d64` | 2026-06-17 | [#7859](https://github.com/decaporg/decap-cms/pull/7859) | chore(deps): bump dompurify from 3.4.0 to 3.4.10 (#7859) | n/a |  | v4 has it at least this new, or no longer uses it |
| `ca3585e68` | 2026-06-17 | [#7860](https://github.com/decaporg/decap-cms/pull/7860) | chore(deps-dev): bump @babel/core from 7.28.5 to 7.29.6 (#7860) | n/a |  | v4 has it at least this new, or no longer uses it |
| `5e38528d0` | 2026-06-17 | [#7862](https://github.com/decaporg/decap-cms/pull/7862) | chore(deps-dev): bump launch-editor from 2.12.0 to 2.14.1 (#7862) | n/a |  | v4 has it at least this new, or no longer uses it |
| `77d4e0abb` | 2026-06-22 | [#7863](https://github.com/decaporg/decap-cms/pull/7863) | chore(deps): bump dompurify from 3.4.10 to 3.4.11 (#7863) | n/a |  | v4 has it at least this new, or no longer uses it |
| `641e2488f` | 2026-06-22 | [#7864](https://github.com/decaporg/decap-cms/pull/7864) | chore(deps-dev): bump webpack-dev-server from 5.2.4 to 5.2.5 (#7864) | n/a |  | v4 has it at least this new, or no longer uses it |
| `9cd663916` | 2026-06-22 | [#7861](https://github.com/decaporg/decap-cms/pull/7861) | chore(deps): bump esbuild and @storybook/react (#7861) | n/a |  | v4 has it at least this new, or no longer uses it |
| `2f5c54d96` | 2026-06-23 | [#7624](https://github.com/decaporg/decap-cms/pull/7624) | fix: add separator and sorting for unpublished entries (#7624) | ported-by-laika | 4c4a9e3c8 |  |
| `128207a46` | 2026-07-13 | [#7879](https://github.com/decaporg/decap-cms/pull/7879) | chore(deps): bump morgan from 1.10.1 to 1.11.0 (#7879) | n/a |  | v4 has it at least this new, or no longer uses it |
| `78c079313` | 2026-07-13 | [#6675](https://github.com/decaporg/decap-cms/pull/6675) | feat: add uuid widget (#6675) | ported-by-laika | 6ffdf364b |  |
| `f57084c43` | 2026-07-13 | [#7880](https://github.com/decaporg/decap-cms/pull/7880) | chore(deps-dev): bump http-proxy-middleware from 2.0.9 to 2.0.10 (#7880) | n/a |  | v4 has it at least this new, or no longer uses it |
| `f4f2a6ced` | 2026-07-14 | [#7881](https://github.com/decaporg/decap-cms/pull/7881) | chore(deps): bump sigstore and lerna (#7881) | n/a |  | v4 has it at least this new, or no longer uses it |
| `1b52b90d3` | 2026-07-14 | [#7726](https://github.com/decaporg/decap-cms/pull/7726) | Forgejo/Codeberg backend with editorial workflow (#7726) | ported-by-laika | 7de5b0e96 |  |
| `825f3d8e4` | 2026-07-15 | [#7866](https://github.com/decaporg/decap-cms/pull/7866) | fix: remove weird padding from group by headings (#7866) | ported-by-laika | 447936673 |  |
| `b1a412d0a` | 2026-07-16 | [#7886](https://github.com/decaporg/decap-cms/pull/7886) | chore(deps-dev): bump websocket-driver from 0.7.4 to 0.7.5 (#7886) | n/a |  | v4 has it at least this new, or no longer uses it |
| `2e6062381` | 2026-07-16 | [#7865](https://github.com/decaporg/decap-cms/pull/7865) | feat: remove frontmatter `draft` from dev-test (#7865) | done | fea0465d0 | main and test-backend demos only; recorded backend demos keep `draft` |
| `14c5d5183` | 2026-07-17 | [#7876](https://github.com/decaporg/decap-cms/pull/7876) | refactor: migrate to React's new JSX runtime (#7876) | n/a |  | v4 already uses the automatic JSX runtime |
| `6c81f3c51` | 2026-07-21 | [#7890](https://github.com/decaporg/decap-cms/pull/7890) | chore(deps): bump axios from 1.16.0 to 1.18.1 (#7890) | n/a |  | v4 has it at least this new, or no longer uses it |
| `16fd12fe7` | 2026-07-23 | [#7894](https://github.com/decaporg/decap-cms/pull/7894) | Update dependencies (#7894) | n/a |  | lockfile/dependency refresh; v4 has its own catalog |
| `8f23db0f9` | 2026-07-23 | [#7896](https://github.com/decaporg/decap-cms/pull/7896) | fix(richtext): preserve block images in list items (#7896) | done | 3f3b1abd9 | fix came with the Plate richtext port (ec72c45ec); test ported here |
| `40c4ac0d5` | 2026-07-23 | [#7451](https://github.com/decaporg/decap-cms/pull/7451) | feat: add collection size limit feature (#7451) | done | 14747a571 | selector in core/lib/canCreateNewEntry; e2e with a config override |
| `ffe5ab7e6` | 2026-07-23 |  | chore(release): publish | n/a |  | release commit |
| `d8436e6a2` | 2026-07-24 | [#7914](https://github.com/decaporg/decap-cms/pull/7914) | fix: bump incompatible react-tostify version (#7914) | n/a |  | v4 replaced react-toastify with Base UI toasts |
| `bc76c05a8` | 2026-07-24 |  | chore(release): publish | n/a |  | release commit |
| `e50c1b16f` | 2026-07-24 | [#7927](https://github.com/decaporg/decap-cms/pull/7927) | chore(deps-dev): bump webpack-dev-server from 5.2.6 to 6.0.0 (#7927) | n/a |  | v4 has it at least this new, or no longer uses it |
| `c427e2a35` | 2026-08-10 | [#7953](https://github.com/decaporg/decap-cms/pull/7953) | chore(deps): bump dompurify from 3.4.12 to 3.4.13 (#7953) | n/a |  | v4 has it at least this new, or no longer uses it |
| `1ac1dc26d` | 2026-08-11 | [#7943](https://github.com/decaporg/decap-cms/pull/7943) | chore(deps): bump ip-address from 10.2.0 to 10.5.0 (#7943) | n/a |  | v4 has it at least this new, or no longer uses it |
| `22ddfe8cc` | 2026-08-11 | [#7954](https://github.com/decaporg/decap-cms/pull/7954) | chore(deps-dev): bump postcss from 8.5.21 to 8.5.26 (#7954) | done | 3c6db437c | lockfile refreshed past it |
| `44da55696` | 2026-08-11 | [#7948](https://github.com/decaporg/decap-cms/pull/7948) | chore(deps): bump fast-uri from 3.1.4 to 3.1.5 (#7948) | done | 3c6db437c | lockfile refreshed past it |
| `ac7dd7ab9` | 2026-08-11 | [#7947](https://github.com/decaporg/decap-cms/pull/7947) | chore(deps): bump undici from 6.27.0 to 6.28.0 (#7947) | n/a |  | v4 has it at least this new, or no longer uses it |
| `a82d93578` | 2026-08-13 | [#7934](https://github.com/decaporg/decap-cms/pull/7934) | fix(backend-git-gateway): restore PKCE session on page reload (#7934) | done | b6601ac7f | real git-gateway PKCE check still open |
| `bfe0dfd65` | 2026-08-19 | [#7951](https://github.com/decaporg/decap-cms/pull/7951) | fix: solve flaky/failing tests (#7951) | done | a21a9fb81 | failure half only; in-flight dedupe already covered by queryCore |
| `c7af08ac5` | 2026-08-19 | [#7936](https://github.com/decaporg/decap-cms/pull/7936) | chore(deps-dev): bump nx from 21.6.11 to 23.1.1 (#7936) | n/a |  | v4 has it at least this new, or no longer uses it |
| `2b772c789` | 2026-08-21 | [#7845](https://github.com/decaporg/decap-cms/pull/7845) | Support browser image transformations (#7845) | done | 2d1d3f4a7 | media_processing canonical, image_optimization deprecated; WASM shipped beside script-tag bundles |
| `1f6f71c23` | 2026-08-31 |  | Merge commit from fork | done | a872fe4d1 | GHSA-jm5q-pq3r-26g9; real-backend check (Bitbucket via Netlify auth) still open |
| `532fbb6ea` | 2026-08-31 |  | Merge commit from fork | done | 5f8748117 | keeps "missing folder lists nothing" (upstream later did the same in #7965); also guards v4-only listRepoFolders |
| `63c8abdbd` | 2026-08-31 |  | chore(release): publish | n/a |  | release commit |
| `74879f5a5` | 2026-08-31 |  | fix(media-library): guard against undefined selectedFile when files empty | n/a |  | reverted upstream by 21a22e025 |
| `21a22e025` | 2026-08-31 |  | Revert "fix(media-library): guard against undefined selectedFile when files empty" | n/a |  | revert |
| `d532e6623` | 2026-09-01 | [#7965](https://github.com/decaporg/decap-cms/pull/7965) | fix: Windows path-mock regression and media library upload/delete edge case (#7965) | done | 545a284da | path unmock only; listRepoFiles and media library guards already on v4 |
| `cec9441e1` | 2026-09-02 | [#7932](https://github.com/decaporg/decap-cms/pull/7932) | fix(gitlab): refresh expired tokens for GraphQL and REST 401s (#7932) | done | 51b992a20 | wrapper drops Apollo 4's lowercased auth header; real GitLab check still open |
| `4d3d3ba3c` | 2026-09-02 | [#7899](https://github.com/decaporg/decap-cms/pull/7899) | fix(richtext): render nested shortcodes in preview (#7899) | done | a095fe30d |  |
| `5cad3e130` | 2026-09-02 | [#7645](https://github.com/decaporg/decap-cms/pull/7645) | refactor: migrate from npm to pnpm (#7645) | n/a |  | v4 is already pnpm |
| `060c15b6a` | 2026-09-03 | [#7972](https://github.com/decaporg/decap-cms/pull/7972) | fix(widget-list): route list item changes by item id, not position (#7972) | done | bd937bac9 | v4 variant was worse: stale handler resurrected removed items |
| `a35d0fdae` | 2026-09-03 | [#7968](https://github.com/decaporg/decap-cms/pull/7968) | Fix: improve relation widget (#7968) | done | e24733b40 | also fixes the shared combobox blank band and lets items truncate |
| `c1ea921ad` | 2026-09-08 | [#7974](https://github.com/decaporg/decap-cms/pull/7974) | chore(deps): bump immutable from 3.8.2 to 4.3.9 (#7974) | n/a |  | v4 removed Immutable |
| `8b563553a` | 2026-09-08 | [#7612](https://github.com/decaporg/decap-cms/pull/7612) | fix: applying collection filter on i18n: single file (#7612) | done | 0b0b362c1 | adds the i18n demo collection too |
| `dd9219ce8` | 2026-09-08 | [#7970](https://github.com/decaporg/decap-cms/pull/7970) | fix(preview): preserve blob: image URLs when sanitizing preview HTML (#7970) | done | 527ecc6e3 | richtext only; v4 has no markdown widget |
| `6141cb822` | 2026-09-08 |  | chore: update update-browserslist-db | n/a |  | lockfile |
| `09b6222b0` | 2026-09-08 |  | chore: update nx.json | n/a |  | nx; v4 has no nx |
| `570c3e7fb` | 2026-09-08 |  | chore(release): publish | n/a |  | release commit |
| `59843046c` | 2026-09-09 | [#7976](https://github.com/decaporg/decap-cms/pull/7976) | fix: support Forgejo editorial workflow PR heads (#7976) | done | b0e67531f | real Forgejo check still open |
| `3def52921` | 2026-09-10 | [#7980](https://github.com/decaporg/decap-cms/pull/7980) | fix(release): verify published manifests, widen catalog: guard (#7980) | n/a |  | lerna release tooling; v4 uses changesets |
| `e857f7dac` | 2026-09-10 | [#7958](https://github.com/decaporg/decap-cms/pull/7958) | feat(widget-markdown): support inline custom editor components (#7958) | skip |  | decision 2026-10-06: no markdown inline components in v4 |
| `119ddb117` | 2026-09-10 | [#7981](https://github.com/decaporg/decap-cms/pull/7981) | chore(deps): bump morgan from 1.10.1 to 1.12.0 (#7981) | n/a |  | v4 has it at least this new, or no longer uses it |
| `31b352940` | 2026-09-10 |  | chore(release): publish | n/a |  | release commit |
| `138f6a411` | 2026-09-10 | [#7982](https://github.com/decaporg/decap-cms/pull/7982) | fix(release): add manual publish trigger, tolerate registry lag (#7982) | n/a |  | lerna release tooling |
| `23a108cc0` | 2026-09-10 |  | ci: make package publishing resumable with explicit dist-tags | n/a |  | lerna release tooling |
| `62b7b2400` | 2026-09-11 |  | fix(relation): retry menu options after a failed query and cache only success | n/a |  | reverted upstream by 97f788a18 |
| `66c133dfc` | 2026-09-11 |  | fix(relation): guard shouldComponentUpdate when nextState is missing | n/a |  | reverted upstream by 97f788a18 |
| `97f788a18` | 2026-09-11 |  | Revert "fix(relation): retry menu options after a failed query" and its follow-up | n/a |  | revert |
| `b994417f8` | 2026-09-22 | [#7793](https://github.com/decaporg/decap-cms/pull/7793) | Feature/optimize editor performance (#7793) | ported-by-laika | 9c36573e3 | came from Laika's optimize-editor-performance branch |
| `f269a8a4f` | 2026-09-22 | [#7994](https://github.com/decaporg/decap-cms/pull/7994) | Notes pane improvements, GitLab support (#7994) | done | 5941e825b, d6d6aa9c8 | ported together with #7563 |
| `1d5868347` | 2026-09-22 |  | chore(release): publish | n/a |  | release commit |
| `56ca43672` | 2026-01-08 |  | feat(proxy): wip - first draft / caching allEntriesByFolder | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `ed3a1c8fb` | 2026-01-16 |  | feat(proxy): fetch and save data in batches, await the validation to get latest data | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `09532f90b` | 2026-01-16 |  | feat(proxy): lint | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `24be973e0` | 2026-01-16 |  | feat(proxy): add supabase-github-proxy as possible backend in CmsBackendType | done | 028fd856e | Turbo, at its final upstream state |
| `dc9b27cc4` | 2026-01-16 |  | feat(proxy): force reload entries after publishing if backend is supabase-github-proxy | done | 028fd856e | Turbo, at its final upstream state |
| `60dfb8aba` | 2026-01-23 |  | feat(supbase-github-proxy): add filtering from github implementation to allEntriesByFolder | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `18ccebbf6` | 2026-01-25 |  | feat(supabase-github-proxy): sort files according to tree | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `a8bec9b87` | 2026-02-05 |  | feat(supabase-github-proxy): allow searching on the cached backend query | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `0b762b303` | 2026-02-05 |  | fix: revert config.yml | n/a |  | reverts a dev-test config change from the same branch |
| `17f228ad5` | 2026-02-12 |  | feat(deap-turbo): create decap-turbo backend - wip | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `87ed3964e` | 2026-03-13 |  | feat(supabase-github-proxy): add site_id support, update readme | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `bdf52bc79` | 2026-03-13 |  | feat: update package name and enhance backend implementation with site_id support | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `8211e1919` | 2026-03-25 |  | feat(decap-turbo): add entriesByFolder method and link it to allEntriesByFolder | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `a4e8ad9e0` | 2026-05-26 |  | feat(decap-turbo): further implementation of supabase backend & token management | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `60b963ba0` | 2026-07-30 |  | feat: rename turbo keys, add backend config resolver | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `3a6db9fc3` | 2026-07-31 |  | feat(decap-turbo): enhance API request handling with site_id support | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `9cd8963bf` | 2026-07-31 |  | feat(decap-turbo): add backend preload config check in handleLocalBackend function | done | 028fd856e | Turbo, at its final upstream state |
| `bd173a229` | 2026-08-04 |  | feat(decap-turbo): implement backend-agnostic permissions handling | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `a57ebb587` | 2026-08-05 |  | feat(decap-turbo): refactor authentication page for improved popup handling and UI updates | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `f8f151b25` | 2026-08-05 |  | feat(decap-turbo): update configuration handling and improve error messaging | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `cbf7e3470` | 2026-08-06 |  | fix: ensure updateUserCredentials defaults to a no-op function | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `7bb0c746d` | 2026-08-06 |  | refactor: improve code formatting and readability across multiple files | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `f9b4e4058` | 2026-08-07 |  | feat(decap-turbo): update Turbo login URL to use new authentication endpoint | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `ae1bd7938` | 2026-08-13 |  | feat: harden turbo backend auth, config, and API error handling | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `faa32555d` | 2026-08-13 |  | feat(backend-turbo): add fire-and-forget CMS usage telemetry | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `4624d9e4a` | 2026-08-13 |  | feat(backend-turbo): add telemetry, reject use_graphql, drop debug logs | done | 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `8caaf5416` | 2026-08-14 |  | fix: reload entries after persist based on backend config | done | 028fd856e, 69d4d1e46, b1deefbf6 | Turbo, at its final upstream state |
| `ea09b3995` | 2026-08-14 |  | feat: add turbo gitlab backend, rename turbo-github | done | 028fd856e, 69d4d1e46, b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `8aa113e60` | 2026-08-14 |  | chore(decap-cms-backend-turbo-gitlab): add webpack config | done | 8420159ee | Turbo, at its final upstream state |
| `479d9b0a7` | 2026-08-17 |  | fix: always route local_backend through proxy detection | done | 028fd856e | Turbo, at its final upstream state |
| `a62674ab6` | 2026-08-19 |  | docs: add README for turbo-gitlab backend package | done | 8420159ee | Turbo, at its final upstream state |
| `c66415095` | 2026-08-21 |  | feat(turbo-github,turbo-gitlab): add getToken | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `8d1995164` | 2026-08-21 |  | feat: add S3-compatible media library, remove standalone Bunny package | done | 028fd856e | Turbo, at its final upstream state |
| `8ee54c97c` | 2026-08-24 |  | fix: dispatch doneAuthenticating after login failure | n/a |  | v4 loginUser is a createAsyncThunk; its rejected case already clears isFetching |
| `a5280e85d` | 2026-08-25 |  | feat: exchange one-time code for tokens instead of reading them from URL | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `473577beb` | 2026-08-25 |  | fix: pass site_id as query param so exchange CORS preflight can validate it | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `1259a0ab0` | 2026-08-25 |  | fix(turbo-backends): refresh session before authenticated requests | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `37e252725` | 2026-08-26 |  | refactor: move Turbo cache writes server-side, read via collections set | done | b1deefbf6 | Turbo, at its final upstream state |
| `9062ea9ae` | 2026-08-26 |  | fix(turbo-github): verify a cached entry is current before trusting it | done | b1deefbf6 | Turbo, at its final upstream state |
| `14d0e9a07` | 2026-08-26 |  | feat(turbo-github): serve files collections from the Turbo cache | done | b1deefbf6 | Turbo, at its final upstream state |
| `03a283d28` | 2026-08-27 |  | fix(backend-turbo-github): reinstate unsaved files in collection sync | done | b1deefbf6 | Turbo, at its final upstream state |
| `4d9400bd5` | 2026-08-27 |  | feat(turbo-gitlab): sync collections server-side, matching turbo-github | done | 028fd856e, b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `6ce4bbff9` | 2026-08-27 |  | docs: trim caching-project narrative from comments | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `d3d40d1b3` | 2026-08-27 |  | fix(core): don't let a create overwrite an existing i18n entry | done | baadf1481 | default-locale probe only; "only a 404 means absent" not ported, see below |
| `7b42f7c6a` | 2026-08-28 |  | feat(turbo): surface a deferred sync instead of silently short collections | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `a8534c5e9` | 2026-08-28 |  | fix: refresh stale token before setting active site id in Supabase | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `ea0a9ea7f` | 2026-08-28 |  | fix: don't let a stale trailing refresh mask a successful active-site update | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `affc35848` | 2026-08-28 |  | fix(turbo-github,turbo-gitlab): make control-plane repo/branch authoritative over config.yml | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `2f3bdd4bb` | 2026-08-28 |  | fix(widget-relation): don't let selected options crowd out search matches | n/a |  | already on v4 with the #7968 port (search results first) |
| `eb40df66a` | 2026-08-31 |  | feat(turbo-github,turbo-gitlab): enrich cms_entry_saved telemetry | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `476ee34fa` | 2026-09-01 |  | feat(backend-turbo): add save-path metrics to cms_entry_saved event | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `9033db718` | 2026-09-01 |  | feat(backend-turbo-github): commit via Turbo edge endpoint | done | b1deefbf6 | Turbo, at its final upstream state |
| `05ad284cd` | 2026-09-01 |  | feat(turbo-github): flag assets in the commit payload (B2) | done | b1deefbf6 | Turbo, at its final upstream state |
| `b51a74488` | 2026-09-01 |  | fix: release editor before media library reload on entry save | done | 1b6ff7177 |  |
| `b95546d9c` | 2026-09-02 |  | feat(turbo-github): poll site_deployments for deploy status (A3) | ask |  | deploy-status feature: not ported, pending decision |
| `4aa5b0afc` | 2026-09-02 |  | feat(core): follow a save's deploy in one updating toast (A4) | ask |  | deploy-status feature: not ported, pending decision |
| `6e7bee01f` | 2026-09-02 |  | fix(core): let a new save clear the previous deploy toast in every state | ask |  | deploy-status feature: not ported, pending decision |
| `ce3ef092a` | 2026-09-02 |  | feat(core,turbo-github): async, entry-scoped deploy notifications (A4b) | ask |  | deploy-status feature: not ported, pending decision |
| `73fc570b2` | 2026-09-02 |  | fix(turbo-github): three defects in the ledger watcher | ask |  | deploy-status feature: not ported, pending decision |
| `a115a1906` | 2026-09-02 |  | fix(core): let an update cancel a queued dismissal | ask |  | deploy-status feature: not ported, pending decision |
| `18278989b` | 2026-09-02 |  | feat(deploy-status): a Deploys page and a header state indicator (A8) | ask |  | deploy-status feature: not ported, pending decision |
| `43390116c` | 2026-09-02 |  | fix(deploy-status): subscribe once the user exists, not only at mount | ask |  | deploy-status feature: not ported, pending decision |
| `cb998a37d` | 2026-09-02 |  | refactor(deploy-status): address review of the Deploys page and indicator | ask |  | deploy-status feature: not ported, pending decision |
| `6bce67b50` | 2026-09-02 |  | feat(deploy-status): saved entry and published-to columns, stateful nav | ask |  | deploy-status feature: not ported, pending decision |
| `69f57764b` | 2026-09-02 |  | fix(deploy-status): only the site's own branch can be Live | ask |  | deploy-status feature: not ported, pending decision |
| `465bdd7b0` | 2026-09-02 |  | fix(core): stop Editor crashing when its route names a collection missing from state | n/a |  | v4 withWorkflow is unused; the editor renders under CollectionGuard |
| `295ae6dae` | 2026-09-02 |  | feat(turbo-github,turbo-gitlab): show signed-in user identity and clear session on logout | done | 028fd856e, b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `133dd267c` | 2026-09-02 |  | perf(turbo-github,turbo-gitlab,backend-github): cut redundant and duplicate reads | done | bff12125b, b1deefbf6 | plain GitHub half earlier; Turbo half with the backend |
| `f8e58aeea` | 2026-09-02 |  | perf(core,turbo-github): answer "is this entry in the workflow" from state | skip |  | perf shortcut answering workflow membership from state; needed three follow-up fixes upstream; v4 keeps asking the backend per slug |
| `2792b04c9` | 2026-09-02 |  | fix: make pnpm run build and lint work under corepack-managed pnpm | n/a |  | corepack/pnpm build fix for the old monorepo |
| `e456ac6db` | 2026-09-02 |  | fix(turbo-github,turbo-gitlab): refresh the token before fetching permissions | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `cd9b02829` | 2026-09-02 |  | perf(turbo-github): route a first editorial-workflow save through _content/commit | done | b1deefbf6 | Turbo, at its final upstream state |
| `35290647f` | 2026-09-02 |  | fix(turbo-github): do not watch a deploy for an editorial-workflow save | ask |  | deploy-status feature: not ported, pending decision |
| `591c14591` | 2026-09-02 |  | fix(core): give the unpublished-entry shortcut a freshness window | n/a |  | fixes the workflow-membership shortcut from f8e58aeea, which v4 does not have |
| `90b58c822` | 2026-09-02 |  | fix(core,turbo-github): three defects in deploy watching | ask |  | deploy-status feature: not ported, pending decision |
| `9edbd073f` | 2026-09-02 |  | chore(turbo-github,turbo-gitlab): unbreak type-check and lint | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `0aba0fc7a` | 2026-09-03 |  | fix(turbo-github,turbo-gitlab): treat a dead refresh token as terminal | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `feb232e87` | 2026-09-03 |  | feat(deploys): live per branch, a stalled state, and table controls | ask |  | deploy-status feature: not ported, pending decision |
| `a32ba3051` | 2026-09-03 |  | fix(deploys): name the success state in the filter | ask |  | deploy-status feature: not ported, pending decision |
| `b3b3a6a43` | 2026-09-03 |  | feat(deploys): filter by the state shown, and sort every column | ask |  | deploy-status feature: not ported, pending decision |
| `b26cb2722` | 2026-09-03 |  | perf(core,turbo-github,turbo-gitlab): stop hydrating every draft, cache i18n siblings | done | 028fd856e, b1deefbf6 | localeSiblingRegex only; the draft-hydration change is the workflow shortcut, not ported |
| `c38e1fa36` | 2026-09-04 |  | fix(turbo-github,turbo-gitlab): let config.yml's branch beat the sites row | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `27927cbbe` | 2026-09-07 |  | fix(core,media-library-s3): stop handing media libraries the refresh token | skip |  | media library context for the S3 library, which is not ported |
| `1a2c097e2` | 2026-09-07 |  | fix(media-library-s3): stop logging response headers on API errors | skip |  | S3 media library: not ported (owner chose lib-turbo, backends and CLI) |
| `28e58fd76` | 2026-09-07 |  | fix(turbo-github,turbo-gitlab): stop sending an email, and log the branch actually committed to | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `a349f2c2a` | 2026-09-09 |  | chore(core,turbo-github,turbo-gitlab,media-library-s3): clear the lint drift | n/a |  | lint drift in Turbo-era code |
| `7f6e6b1b5` | 2026-09-09 |  | fix(core): match the preview-path sentinel by origin, not by prefix | ask |  | deploy-status feature: not ported, pending decision |
| `5deeb6e68` | 2026-09-09 |  | fix(core): stop a persisted slug passing for a loaded workflow list | n/a |  | reverted upstream by 6bfbe4e17 |
| `6bfbe4e17` | 2026-09-09 |  | Revert "fix(core): stop a persisted slug passing for a loaded workflow list" | n/a |  | revert |
| `a9d5c942b` | 2026-09-09 |  | test(e2e): report unmatched routes and DOM state when a spec fails | n/a |  | Cypress triage probe |
| `ccdd71d30` | 2026-09-09 |  | fix(core): do not let a stale listing certify a draft as published | n/a |  | fixes the workflow-membership shortcut, which v4 does not have |
| `743a18e37` | 2026-09-09 |  | test(e2e): probe the workflow absence shortcut | n/a |  | e2e probe, reverted by 109f35b35 |
| `efbd05279` | 2026-09-09 |  | fix(core): key a new workflow entry on the slug the backend committed | n/a |  | fixes the workflow-membership shortcut, which v4 does not have |
| `109f35b35` | 2026-09-09 |  | Revert the e2e triage probes | n/a |  | revert of the e2e probes |
| `1c8c55b02` | 2026-09-10 | [#7980](https://github.com/decaporg/decap-cms/pull/7980) | fix(release): verify published manifests, widen catalog: guard (#7980) | n/a |  | duplicate of 3def52921 (#7980), already n/a |
| `65526d2da` | 2026-09-10 | [#7958](https://github.com/decaporg/decap-cms/pull/7958) | feat(widget-markdown): support inline custom editor components (#7958) | skip |  | duplicate of e857f7dac (#7958), skipped by decision 2026-10-06 |
| `5bfbd0ac2` | 2026-09-10 |  | fix(release): choose the dist-tag, and stop losing publish flags | n/a |  | lerna release tooling |
| `26e4fca41` | 2026-09-10 |  | chore(release): publish | n/a |  | release commit |
| `0de9d7fc5` | 2026-09-11 |  | fix: backend name | skip |  | S3 media library: not ported (owner chose lib-turbo, backends and CLI) |
| `fc3b64788` | 2026-09-14 |  | fix(turbo-github): send the branch this deploy edits as the commit base | done | b1deefbf6 | commit `base` sent on every save |
| `c095e302b` | 2026-09-14 |  | chore(release): publish | n/a |  | release commit |
| `653ed42fd` | 2026-09-11 |  | fix(relation): retry menu options after a failed query and cache only success | n/a |  | duplicate of 62b7b2400, reverted upstream |
| `bae677650` | 2026-09-11 |  | fix(relation): guard shouldComponentUpdate when nextState is missing | n/a |  | duplicate of 66c133dfc, reverted upstream |
| `4eadffe5a` | 2026-09-11 |  | Revert "fix(relation): retry menu options after a failed query" and its follow-up | n/a |  | revert (duplicate of 97f788a18) |
| `048aa3bbd` | 2026-09-22 | [#7793](https://github.com/decaporg/decap-cms/pull/7793) | Feature/optimize editor performance (#7793) | ported-by-laika | 9c36573e3 | duplicate of b994417f8 (#7793) |
| `3d9371cd4` | 2026-09-22 | [#7994](https://github.com/decaporg/decap-cms/pull/7994) | Notes pane improvements, GitLab support (#7994) | done | 5941e825b, d6d6aa9c8 | duplicate of f269a8a4f (#7994) |
| `2414aca6e` | 2026-09-22 |  | feat: attribute Turbo notes to signed-in editor and fix github issue lookup | done | 69d4d1e46, 75bd4b9bc | note identity; the GitHub lookup part was already on v4 |
| `33e5ec65e` | 2026-09-22 |  | chore: switch CDN links from unpkg to jsdelivr | done | 02dffc34d | only the schema link in the package README was left |
| `eb2950962` | 2026-09-22 |  | chore(release): publish | n/a |  | release commit |
| `d6ee259ce` | 2026-10-01 |  | feat(decap): add the decap CLI and the Decap Turbo API contract | done | e0480a4f7 | decap CLI (packages/decap) |
| `58f88882d` | 2026-10-01 |  | feat(decap): move decap-server into `decap dev` | done | e0480a4f7 | decap CLI (packages/decap) |
| `18a6a20dc` | 2026-10-02 |  | feat(decap): turbo management commands generated from the API contract | done | e0480a4f7 | decap CLI (packages/decap) |
| `2884f29fc` | 2026-10-02 |  | feat(core): editor API, field actions and the Turbo editor bridge | done | 1a19ab64b, 69d4d1e46, e0480a4f7 | core editor API and field actions, editor bridge, CLI editor operations |
| `918c48132` | 2026-10-08 |  | fix(turbo): refuse login to a site the user is not assigned to | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `fbb445dd3` | 2026-10-08 |  | fix(turbo): stop CMS tabs and the dashboard logging each other out | done | 028fd856e, b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `20c99e0c4` | 2026-10-08 |  | fix(core): stop a failed workflow load from retrying on every render | done | 229dec56b | requestWithBackoff half; the retry-on-render half n/a (v4 only loads on collection change) |
| `9752f3c66` | 2026-10-08 |  | fix(core): keep generated slugs and i18n deletes within what git accepts | done | 66d54d1f9 | slug byte budget; the i18n-delete half was already v4 72c5ad8f7 |
| `457398989` | 2026-10-08 |  | fix(github): find notes issues by label instead of search | done | b42cf0c6d |  |
| `ef2cefaea` | 2026-10-08 |  | fix(turbo): end a dead session once instead of failing every request | done | 028fd856e, b1deefbf6 | Turbo, at its final upstream state |
| `3983a1a77` | 2026-10-08 |  | fix(turbo): make the editor bridge opt-in | done | 1a19ab64b, 69d4d1e46, e0480a4f7 | editor bridge opt-in via editor_bridge |
| `b98ac09d6` | 2026-10-08 |  | fix(core): keep field actions from re-rendering every field | done | 1a19ab64b |  |
| `13ff6a51d` | 2026-10-08 |  | fix(decap): treat boolean contract fields as switches | done | e0480a4f7 | decap CLI (packages/decap) |
| `afe532e04` | 2026-10-08 |  | fix(decap): forget the stored token even when revoking it fails | done | e0480a4f7 | decap CLI (packages/decap) |
| `3defac893` | 2026-10-08 |  | fix(decap): open the login link on Windows without a shell | done | e0480a4f7 | decap CLI (packages/decap) |
| `d85afe14f` | 2026-10-08 |  | fix(decap): revoke the token a new login replaces | done | e0480a4f7 | decap CLI (packages/decap) |
| `486c9e99c` | 2026-10-08 |  | fix(decap): fail fast when the instance has no CLI API | done | e0480a4f7 | decap CLI (packages/decap) |
| `ae3811319` | 2026-10-08 |  | fix(turbo-gitlab): end a dead session once instead of failing every request | done | b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `562f74a23` | 2026-10-08 |  | docs(core): mark CMS.editor and CMS.registerFieldAction experimental | done | 1a19ab64b |  |
| `da86c70c0` | 2026-10-08 |  | docs(decap): fix the README for the npm release | done | e0480a4f7 | decap CLI (packages/decap) |
| `9afaf93e6` | 2026-10-08 |  | chore(release): keep latest on the newest beta of beta-only packages | n/a |  | release commit |
| `c1927b9d1` | 2026-10-08 |  | feat(decap): publish the CLI as @decap/cli | done | e0480a4f7 | decap CLI (packages/decap) |
| `e7b981522` | 2026-10-08 |  | chore(release): publish | n/a |  | release commit |
| `090cb56eb` | 2026-10-08 |  | fix(release): treat a staged upload as done and a tag move as a warning | n/a |  | release tooling |
| `9860058e2` | 2026-10-12 |  | refactor(core): ship the Deploys page as a plain table | ask |  | deploy-status feature: not ported, pending decision |
| `e57639bcd` | 2026-10-12 |  | fix(core): search body only on backends that search it, and other GA fixes | n/a |  | body search and notification signature were Turbo-branch additions; workflow key half is the shortcut; rest tidies Turbo code |
| `c779d90b1` | 2026-10-12 |  | fix(turbo-github,turbo-gitlab): send site_id on login and drop the GraphQL deep import | done | ec065c035, 69d4d1e46, b1deefbf6 |  |
| `8dcfe3e6d` | 2026-10-12 |  | fix(media-library-s3): encode object keys and surface plan-gate errors | skip |  | S3 media library: not ported (owner chose lib-turbo, backends and CLI) |
| `9d5c98e78` | 2026-10-12 |  | fix(decap): reject unknown flags, report a busy port, await file moves | done | 6c76e0335, 139fe8707, e0480a4f7 | the await-file-moves bug was in v4 dev-server too |
| `1ec8351f2` | 2026-10-12 |  | chore(release): prepare the GA graduation | n/a |  | release |
| `517d0938d` | 2026-10-12 |  | docs: rewrite the Turbo package READMEs for GA | done | b1deefbf6, 8420159ee | backend READMEs |
| `915b0bec8` | 2026-10-12 |  | fix(core): hide create, delete and publish on view-only collections | done | 028fd856e | Turbo, at its final upstream state |
| `367b5286a` | 2026-10-12 |  | feat(lib-turbo): share the Turbo backends' session, fetch, cache and login code | done | 028fd856e, 69d4d1e46, b1deefbf6, 8420159ee | Turbo, at its final upstream state |
| `9bbd32bea` | 2026-10-12 |  | refactor: keep only the comments that say why | n/a |  | comment-only cleanup |
| `981c4d83c` | 2026-10-12 |  | ci(publish): let a dispatch exempt hand-bootstrapped packages from provenance | n/a |  | CI |
| `9632cb051` | 2026-10-12 |  | ci: build the CLI for the proxy e2e specs; skip POSIX modes on Windows | done | e0480a4f7 | spec part only; CI part left out |
| `cd60ad09d` | 2026-10-12 |  | fix(lib-turbo): parse Server-Timing durations without backtracking | done | 69d4d1e46 | Turbo, at its final upstream state |
| `772a44ce8` | 2026-10-12 |  | ci: build the CLI's workspace dependencies before the CLI | n/a |  | CI |
| `606008240` | 2026-10-12 |  | chore(release): publish | n/a |  | release commit |
| `11be0474e` | 2026-10-13 |  | ci(smoke): install the entries' workspace peers from their tarballs | n/a |  | CI |
| `d72113caf` | 2026-10-13 |  | chore(release): publish | n/a |  | release commit |
| `9f1191932` | 2026-10-13 |  | fix(lib-turbo): read a proxy refusal lib-util already consumed | done | 69d4d1e46 | Turbo, at its final upstream state |
| `46cc1546e` | 2026-10-14 |  | chore(release): publish | n/a |  | release commit |
| `6cad4750d` | 2026-10-14 |  | chore(release): back out the unpublished GA version commit | n/a |  | release commit |
| `e053e26b8` | 2026-10-14 |  | ci(smoke): install workspace peers from the whole dependency tree | n/a |  | CI |
| `58dec6fdb` | 2026-10-14 |  | chore(release): publish | n/a |  | release commit |
| `65ed8cd91` | 2026-10-14 |  | chore(scripts): remove the one-off GA dist-tag script | n/a |  | release script |
| `e63b0558b` | 2026-10-14 | [#8030](https://github.com/decaporg/decap-cms/pull/8030) | chore(deps): bundle dependabot bumps and refresh vulnerable lockfile entries (#8030) | n/a |  | v4 has its own lockfile; the CLI change was for upstream's copied dev server (owner decided against dependency bumps) |
| `3d0dab7ca` | 2026-10-14 | [#8031](https://github.com/decaporg/decap-cms/pull/8031) | fix(turbo): explain a Turbo site with no repo instead of blaming config.yml (#8031) | done | 69d4d1e46 | Turbo, at its final upstream state |
| `f05110384` | 2026-10-14 | [#8032](https://github.com/decaporg/decap-cms/pull/8032) | perf: drop duplicate and unused code from the decap-cms bundle (#8032) | n/a |  | webpack/lodash/immutable bundle dedupe; v4 is vite + lodash-es, no immutable |
| `9d1bb3beb` | 2026-10-14 |  | chore(release): publish | n/a |  | release commit |
| `c194172af` | 2026-10-23 | [#8014](https://github.com/decaporg/decap-cms/pull/8014) | fix(markdown): store pasted image url in node data (#8014) | n/a |  | Slate markdown widget; v4 richtext paste already stores the url in node data (checked) |
| `3d0f6550b` | 2026-10-23 | [#7989](https://github.com/decaporg/decap-cms/pull/7989) | fix(core): preserve full entries returned by preSave handlers (#7989) | done | d23b9b8e8 |  |
| `295904e55` | 2026-10-23 | [#8002](https://github.com/decaporg/decap-cms/pull/8002) | fix(datetime): preserve year while typing (#8002) | done | 07dec4258 |  |
| `65df768cf` | 2026-10-23 | [#7988](https://github.com/decaporg/decap-cms/pull/7988) | fix(widget-list): restore controls for erroneous typed items (#7988) | done | 845a40ba4 |  |
| `cf8098020` | 2026-10-23 | [#8006](https://github.com/decaporg/decap-cms/pull/8006) | fix(relation): match filters against multiple-value fields (#8006) | done | a765f6f47 |  |
| `9155f271e` | 2026-10-23 | [#8000](https://github.com/decaporg/decap-cms/pull/8000) | fix: place slug collision suffix before collection path (#8000) | done | 373b2854e | v4 keeps its key-based handling of `{{slug}}` in a path, so a filtered slug is not re-sanitized |
| `307155155` | 2026-10-23 | [#8007](https://github.com/decaporg/decap-cms/pull/8007) | fix(core): allow uppercase characters in nested collection meta path (#8007) | done | c376dfff3 |  |
| `3eb440119` | 2026-10-23 | [#8034](https://github.com/decaporg/decap-cms/pull/8034) | fix(core): add min and max to relation field types (#8034) | n/a |  | v4 relation field type already has min/max |
| `70d8e2560` | 2026-10-23 | [#8043](https://github.com/decaporg/decap-cms/pull/8043) | fix: several small issues (#8043) | done | 4eb4fe12f | auth origin, Cloudinary folder, richtext default mode, legacy /edit route; ensureRoot already v4 (DCMS-1896); dropdown widths and dep removals n/a |
| `b759e3b85` | 2026-10-23 | [#7991](https://github.com/decaporg/decap-cms/pull/7991) | fix(gitlab): include merge request SHA when publishing (#7991) | done | 7bad59dd8 |  |
| `141b36007` | 2026-10-23 | [#8039](https://github.com/decaporg/decap-cms/pull/8039) | fix(github): list deep trees with REST when using GraphQL (#8039) | done | 06863cf77 |  |
| `7fbecd60b` | 2026-10-23 | [#8038](https://github.com/decaporg/decap-cms/pull/8038) | fix(azure): set login for the authenticated user (#8038) | done | 037458372 |  |
| `c84cb571f` | 2026-10-23 | [#8013](https://github.com/decaporg/decap-cms/pull/8013) | fix(forgejo): use existing fork when it has a different name (#8013) | n/a |  | v4 Forgejo backend has no open authoring / fork support |
| `e92641821` | 2026-10-23 | [#8033](https://github.com/decaporg/decap-cms/pull/8033) | fix(backend-bitbucket): load all pages of pull requests (#8033) | done | 050d10fea | uses lib-util createSemaphore (no semaphore dependency on v4) |
| `b2ffd2dac` | 2026-10-23 | [#8044](https://github.com/decaporg/decap-cms/pull/8044) | docs(git-gateway): fix bitbucket backend link typo (#8044) | n/a |  | typo not present in the v4 README |
| `a5215ccfa` | 2026-10-23 | [#8041](https://github.com/decaporg/decap-cms/pull/8041) | feat(media-library-s3): list Neon Object Storage as a supported provider (#8041) | skip |  | S3 media library: not ported (owner chose lib-turbo, backends and CLI) |
| `4ca83fcde` | 2026-10-23 |  | test(gitlab): expect the merge request sha in recorded publish requests | done | 7bad59dd8 | fixtures updated with the #7991 port |
| `fcd925dab` | 2026-10-23 |  | refactor: simplify the slug suffix loop and the Forgejo fork lookup | done | 373b2854e | slug half folded into the #8000 port; Forgejo half n/a (v4 Forgejo has no open authoring) |
| `a7ba3db14` | 2026-10-26 | [#8046](https://github.com/decaporg/decap-cms/pull/8046) | chore(deps): override vulnerable transitive dependencies (#8046) | n/a |  | owner decided against dependency bumps this sync |
| `9324b482b` | 2026-10-23 |  | fix(decap): keep the dev proxy local and out of .git | done | dbb7e88a0 | ported into src/dev-server; ORIGIN now defaults to localhost; --host flag n/a |
| `a2b0ae153` | 2026-10-23 |  | fix(core): never evaluate JavaScript front matter | n/a |  | v4 frontmatter codec has no JavaScript engine (no gray-matter, no eval) |
| `4b5ac2955` | 2026-10-26 |  | fix(decap): check for .git path segments in linear time | done | dbb7e88a0 | folded into the 9324b482b port |
| `7e817a62c` | 2026-10-26 |  | chore(release): publish | n/a |  | release commit |
| `9e1e68aef` | 2026-10-26 |  | fix(widget-file): download unsaved media instead of opening it | done | eb43f0e1f |  |
| `15422654d` | 2026-10-26 | [#8051](https://github.com/decaporg/decap-cms/pull/8051) | chore(deps): refresh newly flagged lockfile entries (#8051) | n/a |  | owner decided against dependency bumps this sync |
| `b34587cd7` | 2026-10-26 | [#8017](https://github.com/decaporg/decap-cms/pull/8017) | fix(widget-code): size markdown code blocks to their content (#8017) | done | 23362f7fb |  |
| `653c1a6fb` | 2026-10-26 |  | chore(media-library-s3): describe providers generically | skip |  | S3 media library: not ported (owner chose lib-turbo, backends and CLI) |
| `2c7ba9628` | 2026-10-26 |  | chore(release): publish | n/a |  | release commit |
| `987e8faec` | 2026-10-28 |  | fix(turbo): say why the Turbo config request failed instead of "Failed to fetch" | done | 69d4d1e46 | Turbo, at its final upstream state |
| `61ceb6e06` | 2026-10-28 |  | ci(release): wait for lagging provenance before failing the publish | n/a |  | release tooling |

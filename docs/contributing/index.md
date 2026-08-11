# Contributing docs

Repo-level design and process docs for `@laikacms/decap-cms`, split into two buckets:

- **[decisions/](./decisions/)** - why the repo is shaped the way it is: architecture rationale, the
  workspace restructure, breaking-change records, and forward-looking plans.
  - [restructure.md](./decisions/restructure.md) - why the former monorepo is one package with
    subpath exports.
  - [breaking-changes-v4-beta.md](./decisions/breaking-changes-v4-beta.md) - v4.beta breaking
    changes (e.g. the `markdown` widget renamed to `richtext`).
  - [two-seam-model.md](./decisions/two-seam-model.md) - Laika protocol vs. CMS adapters.
  - [entry-type-redesign.md](./decisions/entry-type-redesign.md) - the `lib/domain` + `lib/backend`
    public surfaces, the `BackendEntry` content union, and the projected-entry rule.
  - [architecture.md](./decisions/architecture.md) - assorted technology-choice rationales
    (single-package repo, Emotion, Effect, `yaml`).
  - [format-packs-plan.md](./decisions/format-packs-plan.md) - forkable richtext formats and
    PT-native component blocks.
- **[learnings/](./learnings/)** - things verified or discovered while working on the repo:
  verification records and the tech-debt checklist.
  - [tech-debt.md](./learnings/tech-debt.md) - remaining debt checklist.
  - [dcb-001-pnpm-install.md](./learnings/dcb-001-pnpm-install.md) - `pnpm install` peer-dep
    verification record.
  - [dcb-002-authorization-model.md](./learnings/dcb-002-authorization-model.md) - open-scope +
    consumer-policy authorization model across lib-pat / @laikacms/server oauth2 + api.

Other docs live where they are closest to the code they describe: Base UI primitive notes in
[`packages/decap-cms/src/ui/README.md`](../../packages/decap-cms/src/ui/README.md), core-engine
notes in [`../core/`](../core/), and per-area READMEs alongside their `src/` folders.

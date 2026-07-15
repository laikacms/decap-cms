# Agent skills

Skill files shipped with `@laikacms/decap-cms` for AI agents working in
consumer site repos (DCMS-492). Each skill lives at
`skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`)
followed by the instructions.

They are ejected/refreshed into a site repo by `laika skills install`
(the `laika` CLI ships with the laikacms package), so the guidance agents
read stays versioned with the package it documents.

Current skills:

- `decap-portable-text`: authoring valid Portable Text for `richtext`
  fields (the Lexical bridge in `src/lib/richtext/`).
- `decap-widget-development`: building custom widgets and editor
  components against the plain-JS widget contracts.

Authoring rules: keep them accurate to the source they document (the
type definitions and `src/core/lib/registry.tsx` are the source of
truth), use consumer-facing `@laikacms/decap-cms/*` subpath imports in
examples, and no em dashes (repo-wide convention).

Companion skills covering MCP tool usage, the revision (`rev`) protocol,
and editorial-workflow semantics are authored in the laikacms package,
not here.

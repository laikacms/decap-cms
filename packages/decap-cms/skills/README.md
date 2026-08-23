# Agent skills

Skill files shipped with `decap-cms` for AI agents working in consumer site repos (DCMS-492). Each
skill lives at `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) followed by
the instructions.

Current skills:

- `decap-portable-text`: authoring valid Portable Text for `richtext` fields (the Lexical bridge in
  `src/lib/richtext/`).
- `decap-widget-development`: building custom widgets and editor components against the plain-JS
  widget contracts.
- `decap-api-driving`: driving a running CMS instance through the documents/assets JSON:API (the
  entries, the editorial workflow state machine, the `content` JSON codec, and media upload
  (DCMS-1410).

Authoring rules: keep them accurate to the source they document (the type definitions and
`src/core/lib/registry.tsx` are the source of truth), use consumer-facing `decap-cms/*` subpath
imports in examples, and no em dashes (repo-wide convention).

itself because that package has no skills directory of its own yet. Revisit whether it should move
there once it does; a repo-reachable MCP `read_skill`/`list_skills` tool is a separate follow-up
(DCMS-1410).

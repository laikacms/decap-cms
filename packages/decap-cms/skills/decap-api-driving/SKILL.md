---
name: decap-api-driving
---

# Driving a CMS instance via the API

passes through. It is written for an agent that has API/MCP access but no repo checkout: every claim

If you have `read_api_spec`, fetch `GET {basePath}/openapi.json` on the documents API and the assets
API separately; the two are independent OpenAPI 3.1 documents. This skill tells you which endpoints
to combine and in which order; the spec tells you the exact request/response schema.

## Two APIs, two base paths

under one origin (`base_url` in the site's `backend:` config, e.g. `/api/documents` and
`/api/assets`):

- **Documents API**: entries, meaning published documents, unpublished drafts/review/publish-queue,
  revisions, and the change feed.
- **Assets API**: media, meaning files and folders.

Both speak `application/vnd.api+json` (JSON:API) and share the same error envelope
(`{ errors: [...] }`, HTTP status from `ErrorCodeToStatusMap`). Every write handler ships **no
authentication of its own**; whatever wraps it (decap-api, an MCP server) is responsible for the
bearer token. Send `Authorization: Bearer <token>`.

## Keys, not paths

Entries are addressed by an opaque **key**, not a filesystem path with an extension. A key is
`<collection>/<slug>` (nested collections add more segments, e.g. `posts/2024/my-post`). The backend
strips the `.json`/`.yaml`/`.yml`/`.md`/`.markdown`/`.toml` extension Decap's UI shows you before
calling the API, so when composing a key yourself, never include an extension. Keys are
`decodeURIComponent`'d from the URL path segment, so URL-encode slashes-within-a-segment but not the
`/` that separates collection from slug.

**Only `format: json` collections work today.** The documents API rejects non-object `content`; a
collection without an explicit `format: json` (Decap defaults to markdown-frontmatter) cannot be
saved through this backend. Check the collection's config before writing.

## Finding and listing entries

`GET /record-summaries?filter[folder]=<collection>&filter[depth]=<n>&filter[type]=published|unpublished|all`

- `filter[folder]` scopes to a collection (or subfolder); omit for the whole store.
- `filter[depth]` controls how many path segments deep to recurse (Decap's own list calls typically
- `filter[type]` defaults to `published`; pass `all` to see both published and
  draft/review/publish-queue entries in one call. Unpublished results include their `status` string.
- Pagination: `page[number]`/`page[size]`, `page[offset]`/`page[limit]`, or `page[after]`/
  `page[before]` (cursor). Check `GET /capabilities` first: cursor pagination 400s if the backend
  doesn't support it.
- Use `/records` instead of `/record-summaries` when you need full `content`, not just key/status/
  timestamps, for every result (heavier).

Each summary's `type` tells you which detail endpoint to follow: `published-summary` ->
`GET /published/{key}`, `unpublished-summary` -> `GET /unpublished/{key}`.

## Reading an entry

- `GET /published/{key}`: the live, published version. 404s if the key has never been published.
- `GET /unpublished/{key}`: the current draft/review/publish-queue version. 404s if there is no
  pending edit; a key can have both a published document and an unpublished draft at once (that is
  the normal "editing a live page" case).

Both return `data.attributes.content`, a plain JSON object. This **is** the entry's field data
(Decap's config field names as keys), not a wrapper. There is no separate frontmatter/body split;
`content` is the whole entry.

## Editorial workflow: draft -> review -> publish-queue -> published

Status values (`src/core/constants/publishModes.ts`, `Statuses`):

| value             | meaning                      |
| ----------------- | ---------------------------- |
| `draft`           | being written                |
| `pending_review`  | waiting for review           |
| `pending_publish` | approved, waiting to go live |

These are the values you pass as `status` when creating/updating an **unpublished** record; a
collection's own `unpublishedStatuses` config can use different literal strings, but `draft` /
`pending_review` / `pending_publish` are Decap's defaults and what you will see unless the site
customized them. `published` is a separate resource type (`/published/*`), not an unpublished status
value.

### Create a new draft

```
POST /unpublished
{
  "data": {
    "type": "unpublished",
    "id": "posts/my-new-post",
    "attributes": { "status": "draft", "content": { "title": "...", "body": [...] } }
  }
}
```

`data.id` is the key; it is required (400 without it).

### Edit an existing draft

```
PATCH /unpublished/{key}
{ "data": { "type": "unpublished", "attributes": { "content": { ...merged fields... } } } }
```

`content` on update replaces the whole object; there is no field-level PATCH. Read the current
`content` first (`GET /unpublished/{key}`), modify it client-side, and send the full merged object

### Move status forward (review, approve)

```
PATCH /unpublished/{key}
{ "data": { "type": "unpublished", "attributes": { "status": "pending_review" } } }
```

Same endpoint as content edits; status and content can be updated independently or together.

### Publish

```
POST /unpublished/{key}/publish
```

No body. This is the state transition that promotes the unpublished record to `/published/{key}` and
removes it from the unpublished side. There is no separate "merge draft into published" step; this
one call does it.

### Unpublish (take a live entry back to draft)

```
POST /published/{key}/unpublish
{ "data": { "type": "unpublished", "attributes": { "status": "draft" } } }
```

`attributes.status` is required and becomes the new unpublished record's status.

### Editing an already-published entry directly (no workflow)

```
PATCH /published/{key}
{ "data": { "type": "published", "attributes": { "content": { ...merged fields... } } } }
```

Only valid when the site is not using the draft/review/publish workflow for that write (Decap's
`simple` publish mode). It skips drafts entirely and edits the live document in place.

### Deleting

`DELETE /published/{key}` or `DELETE /unpublished/{key}`. Both are void responses
(`{ meta: { deleted: true } }`); 404 if the key doesn't exist on that side.

### Revisions

`POST /revisions` (`data.id` = key, `data.attributes` = revision payload) to snapshot;
`GET
/revisions/{key}` to list summaries (paginated); `GET /revisions/{key}/{revisionId}` to read one
snapshot's full `content`. Revisions are separate from the unpublished/published split: they are a
history mechanism, not a workflow state.

### Batch operations

`POST /operations` accepts an array of JSON:API-Patch-style
`{ op: 'add' | 'update' | 'remove', ... }` entries and applies them as one request, still one entry
at a time server-side (not a transaction across entries). Prefer the single-resource endpoints above
unless you specifically need to bundle several independent creates/updates/deletes into one HTTP
round trip; malformed shape in any one operation 400s the whole batch before any writes happen
(pre-flight validated), but a mid-batch failure after that point does not roll back earlier
successful operations.

## The `content` JSON codec

`content` is `{ [x: string]: any }` decoded from the raw JSON that Decap's config-driven form
produces: it is exactly the object you would get from `JSON.parse()`'ing the JSON-format entry file.
Field names match the collection's `fields[].name` in `config.yml`. There is no envelope, no
`_type`/`_meta` wrapper at the entry level (unlike individual richtext field values, see below).
Nested/list widgets serialize as nested objects/arrays the same way Decap's own JSON format widget
does.

### Portable Text richtext fields

If a field is `widget: richtext` with `format: portableText`, that field's _value_ (not the whole
entry) is a Portable Text document: a JSON array of block objects. See the companion skill
`decap-portable-text` (`skills/decap-portable-text/SKILL.md`) for the full
block/mark/list/custom-block shape and pitfall checklist before writing to a richtext field; do not
invent Portable Text shapes, that skill is the source of truth and is validated against
`src/lib/richtext/` directly.

If `format:` is omitted or `markdown` (the default), the richtext field's value is a markdown
string, not a Portable Text array. Check the field's `format:` in the collection config before
deciding which shape to write.

## Media upload

`POST {assetsBasePath}/resources`, `multipart/form-data`, field `file` = the binary. Optional
fields: `key` (defaults to the uploaded filename), `mimeType` (defaults to the file's own MIME
type), `filename`, `cacheControl`, `customMetadata` (JSON string of arbitrary key/value pairs), or
pass all of the above except the binary as a single `metadata` form field containing JSON;
individual fields win over `metadata` JSON, which wins over the file's own properties. Response is
`201` with the created asset resource.

JSON (non-multipart) upload is also accepted for base64-encoded content:

```
POST {assetsBasePath}/resources
Content-Type: application/vnd.api+json
{ "data": { "type": "asset", "id": "<key>", "attributes": { "content": "<base64>", "mimeType": "...", "filename": "..." } } }
```

After upload, reference the asset from an entry's `content` the way the field widget expects (a
`string` field storing a path/URL for `widget: image`/`file`, or an embedded block inside a richtext
backend stores assets by bare filename (stripped of any path Decap's UI sent) under a public-folder
prefix (`public_folder` in `config.yml`); reproduce that convention if you are constructing the
reference by hand instead of letting Decap's own picker do it: build the field value from
`public_folder + '/' + <asset key>`, not from an API-internal storage key.

List existing media: `GET {assetsBasePath}/resources?filter[folder]=<path>&filter[depth]=<n>`, same
pagination and capability-gated cursor rules as `/record-summaries`.

## Errors and idempotency

- Every failure is `{ errors: [{ status, title, detail, source? }] }`; `source.pointer` points at
  the JSON:API attribute path when the error is about a specific field.
- Creates (`POST /published`, `POST /unpublished`, `POST {assetsBasePath}/resources`) 400 if the
  content is not a plain object (or, for assets, if the file is missing); there is no silent
  coercion.
- There is no optimistic-concurrency requirement for this skill's flows: `version` is an opaque
  per-record token returned on reads (present when `GET /capabilities` reports
  `versionTracking.supported: true`); this skill's write flows do not require sending it back, but a
  future compare-and-swap capability may. If you re-read before every write (recommended for
  `PATCH`, since it replaces the whole `content`), stale-write races are avoided in practice.

## Task recipe: "edit the body of entry X and publish it"

1. `GET /record-summaries?filter[folder]=<collection>&filter[type]=all` (or search by known key) to
   find the entry's key.
2. `GET /unpublished/{key}` if it exists, else `GET /published/{key}`, to get the current `content`.
3. Modify the target field in `content` client-side (richtext fields: follow the
   `decap-portable-text` skill).
4. If no unpublished draft existed yet: `POST /unpublished` with the merged `content` and
   `status: "draft"`. If one existed: `PATCH /unpublished/{key}` with the merged `content`.
5. `POST /unpublished/{key}/publish`.

Skip steps 4-5 and use `PATCH /published/{key}` directly only if the collection does not use the
draft/review/publish workflow.

## Deferred / out of scope for this skill

- No MCP `read_skill`/`list_skills` tool exists yet to serve this file over the MCP connection
  itself (tracked as a follow-up on DCMS-1410). For now this skill is only reachable by an agent
- `read_api_spec` still returns the full OpenAPI 3.1 document in one call; trimming/segmenting it
  per task is a separate follow-up, not implemented here.

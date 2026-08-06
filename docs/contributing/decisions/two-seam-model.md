# The two-seam model: Laika protocol vs. CMS adapters

Decided 2026-07-16. This document records why the Laika protocol stays CMS-agnostic and why every
CMS (including this Decap fork) integrates through its own opinionated adapter. The mirror of this
decision lives in the laika-cms repo as an ADR; this copy describes it from the Decap side.

## The problem

Two forces pull in opposite directions:

1. Prospective users push back on the idea that adopting Laika means adopting Laika's domain model:
   that they must define their schemas and fields "in Laika's format". This is a misconception we
   keep having to correct, which means the architecture was not communicating it.
2. Decap (and any CMS) has strong opinions: entry shapes, slugs, editorial workflow states, media
   folders, deploy previews, commit messages. If those opinions leak into the protocol, the protocol
   stops being reusable for other CMS frontends and forces Laika's model onto every source.

## The decision

Content flows through two seams, and each seam has a strict owner:

```
source domain          laikacms protocol           CMS adapter              user
(git, DynamoDB,   <->  (repositories: atoms,  <->  (laika-decap-       <->  (interacts with
 Cognito, R2, ...)      folders, keys, meta-        backend: opinion-        their ORIGINAL
                        data, summaries;            ated field/shape         domain model)
                        content = opaque JSON)      expectations)
```

**Seam 1: source domain to protocol.** The laikacms protocol is the whole laikacms bounded context:
a set of repository contracts (`DocumentsRepository`, `AssetsRepository`, `StorageRepository`) plus
default implementations built on top of other repositories. It knows only atoms, folders, keys,
metadata and summaries. The content field is an arbitrary JSON object owned by the user's domain;
the protocol never interprets it. A database is just a storage repository with no folders where the
IDs are keys. Sources compose: a git repository, a DynamoDB repository and a Cognito repository can
be combined behind a routing repository.

**Seam 2: protocol to CMS.** Each CMS gets its own adapter that makes the opinionated choices about
which fields and conventions it expects. For Decap that adapter is the laika backend
(`packages/decap-cms/src/backends/laika/`). Another CMS frontend would get its own adapter with its
own (probably different) opinions.

## Consequences

- **CMS-specific features are adapter responsibilities, never protocol ones.** Deploy previews,
  commit messages/authors and open authoring are Decap concerns. The laika-decap-backend decides how
  (and whether) to express them. The protocol does not grow endpoints for them.
- **Cross-cutting infrastructure concerns go in the protocol, generically.** Version tracking and
  change signals are the canonical example: the protocol exposes an opaque per-record `version`
  string (a git blob sha, a database row version and an R2 ETag are all valid implementations), a
  scope-level sync token that changes when anything inside the scope changes, and an optional change
  feed. All of it is capability-gated via `getCapabilities()` and named in domain-neutral terms.
  Nothing git-flavored crosses the seam.
- **Switching CMS frontends requires a migration.** Because every adapter is opinionated in its own
  way, you cannot swap one CMS for another without migrating. This is accepted and intended: it
  keeps each adapter honest and each CMS integration natural, instead of forcing a
  lowest-common-denominator model on everyone.
- **Users keep their own domain model.** The content field is their JSON. Laika wraps it; it does
  not replace it.

## Terminology

| Term              | Meaning                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| protocol          | The entire laikacms bounded context: repository contracts + default implementations. Laika minus the CMS is "basically a protocol". |
| repository        | One individual contract within the protocol (documents, assets, storage).                                                           |
| adapter / backend | A CMS-specific integration built on repositories. For Decap: the laika backend.                                                     |
| atom / folder     | The protocol's generic storage vocabulary. Wrappers, not a data model imposed on users.                                             |
| version           | Opaque per-record change token. Equal iff content unchanged. Never interpreted, only compared.                                      |
| sync token        | Opaque per-scope change token. Cheap "did anything change?" polling primitive.                                                      |

## What this means for code in this repo

- Generic capabilities are added in laika-cms (`packages/laikacms/src/domain/...`), following the
  existing `PaginationCapability` and `revisionId` patterns.
- Opinionated mappings are added in `packages/decap-cms/src/backends/laika/`.
- The classic git backends (`github`, `gitlab`, ...) keep working unchanged. They are not part of
  the two-seam model and do not gain protocol-level features such as sync tokens; core falls back to
  plain request hygiene for them.

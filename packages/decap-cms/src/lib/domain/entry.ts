/**
 * The domain entry and its parts. This module is pure by rule: it imports
 * nothing (see `src/lib/domain/README.md`), so a type-only import from a host
 * app or dashboard integration stays type-only.
 */

/**
 * Who authored a revision, as attested by the backend. Only `name` is
 * required so backends can start with what they have and fill in identity
 * later without a breaking contract change. Never fabricate these fields
 * client-side.
 */
export type Author = {
  name: string,
  /** Stable per-user identifier (login, email, account id) when the backend has one. */
  id?: string,
  avatarUrl?: string,
};

/**
 * One locale's content. An envelope rather than a bare `data` map so
 * per-locale metadata (its own status, updatedOn, ...) can be added later
 * without changing every consumer's shape.
 */
export type LocaleVariant = {
  data: Record<string, unknown>,
};

/**
 * Entry identity and content, and nothing else. Deliberately absent:
 *
 * - `raw`: view-source is a future on-demand backend operation, not a field
 *   every entry has to carry (and structured backends have no raw text).
 * - `mediaFiles`: media resolution belongs to the media-library store, keyed
 *   by folder/path; drafts carry their own pending uploads.
 * - `label`: derived from collection config by selectors, not denormalized.
 * - `status` / `isModification`: workflow views compose `{ entry, workflow }`.
 * - fetch state (`isFetching`, `isPersisting`, `error`): tracked in a request
 *   map beside the entities, so entry equality and identity stay meaningful.
 */
export type EntryBase = {
  collection: string,
  slug: string,
  path: string,
  data: Record<string, unknown>,
  /** Locale code -> that locale's variant, for i18n collections. */
  i18n?: Record<string, LocaleVariant>,
  author?: Author,
  /** ISO-8601 timestamp of the last change, when the backend reports one. */
  updatedOn?: string,
  meta?: { path?: string },
};

/**
 * An entry loaded in full: every field the collection defines is present, so
 * it is safe to edit, persist, and publish.
 */
export type CompleteEntry = EntryBase & { projected: false };

/**
 * An entry loaded through a projection (search results, list views backed by
 * a trimmed index): the fields not asked for are simply missing, so it may be
 * displayed but must never be edited or written back. Operations that write
 * take `CompleteEntry`, which turns "refetch before editing" from review
 * discipline into a compile error.
 */
export type ProjectedEntry = EntryBase & { projected: true };

export type Entry = CompleteEntry | ProjectedEntry;

/** Builds a complete entry. */
export function createEntry(base: EntryBase): CompleteEntry {
  return { ...base, projected: false };
}

/** Builds a projected (partially loaded) entry. */
export function createProjectedEntry(base: EntryBase): ProjectedEntry {
  return { ...base, projected: true };
}

export function isProjected(entry: Entry): entry is ProjectedEntry {
  return entry.projected;
}

export function isComplete(entry: Entry): entry is CompleteEntry {
  return !entry.projected;
}

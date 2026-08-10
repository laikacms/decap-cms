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
  /** Display name. The only field every backend can be expected to supply. */
  name: string,
  /** Stable per-user identifier (login, email, account id) when the backend has one. */
  id?: string,
  /** Absolute URL of the author's avatar, when the backend exposes one. */
  avatarUrl?: string,
};

/**
 * One locale's content. An envelope rather than a bare `data` map so
 * per-locale metadata (its own status, updatedOn, ...) can be added later
 * without changing every consumer's shape.
 */
export type LocaleVariant = {
  /** This locale's field values, in the same shape as `EntryBase.data`. */
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
  /** Name of the collection this entry belongs to, as configured. */
  collection: string,
  /**
   * Identifier within the collection, unique among its entries. Derived from
   * the path for folder collections and from the file's `name` for file
   * collections; it is what URLs address an entry by.
   */
  slug: string,
  /** Where the entry is stored, relative to the repository or storage root. */
  path: string,
  /**
   * The entry's field values, keyed by field name. For i18n collections this
   * is the default locale's data; the others live in `i18n`. Untyped by
   * design: a runtime-loaded config has no compile-time data shape, so typed
   * access happens at the edge through decoders that validate.
   */
  data: Record<string, unknown>,
  /** Locale code -> that locale's variant, for i18n collections. */
  i18n?: Record<string, LocaleVariant>,
  /** Who last changed the entry, when the backend attests to it. */
  author?: Author,
  /** ISO-8601 timestamp of the last change, when the backend reports one. */
  updatedOn?: string,
  /**
   * Values held outside the entry's fields. `path` is the user-editable path
   * segment of collections configured with `meta.path`, which is why it is
   * separate from the entry's own `path`.
   */
  meta?: { path?: string },
};

/**
 * An entry loaded in full: every field the collection defines is present, so
 * it is safe to edit, persist, and publish.
 */
export type CompleteEntry = EntryBase & {
  /**
   * Discriminates {@link Entry}. `false` means the entry was loaded in full,
   * so writing it back cannot lose fields. Everything that writes (draft
   * creation, persist, publish) takes `CompleteEntry`.
   */
  projected: false,
};

/**
 * An entry loaded through a projection (search results, list views backed by
 * a trimmed index): the fields not asked for are simply missing, so it may be
 * displayed but must never be edited or written back. Operations that write
 * take `CompleteEntry`, which turns "refetch before editing" from review
 * discipline into a compile error.
 */
export type ProjectedEntry = EntryBase & {
  /**
   * Discriminates {@link Entry}. `true` means `data` holds only the fields the
   * source projected (typically what a search index stores), so the entry is
   * safe to display and unsafe to save. Resolve it by refetching the entry,
   * never by casting.
   */
  projected: true,
};

/** An entry, which either was loaded in full or came from a projection. */
export type Entry = CompleteEntry | ProjectedEntry;

/** Builds a complete entry; see {@link CompleteEntry}. */
export function createEntry(base: EntryBase): CompleteEntry {
  return { ...base, projected: false };
}

/** Builds an entry that came from a projection; see {@link ProjectedEntry}. */
export function createProjectedEntry(base: EntryBase): ProjectedEntry {
  return { ...base, projected: true };
}

/** Narrows to an entry that is display-only; the fix for one is a refetch. */
export function isProjected(entry: Entry): entry is ProjectedEntry {
  return entry.projected;
}

/** Narrows to an entry that is safe to edit, persist and publish. */
export function isComplete(entry: Entry): entry is CompleteEntry {
  return !entry.projected;
}

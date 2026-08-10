import type { Author } from '@/lib/domain/index';
import type { CmsAssetProxy, CmsDataFile, CmsImplementationMediaFile } from '@/lib/util/index';
import type { BackendEntryContent } from './content';

/**
 * Where an entry came from, plus whatever revision metadata the backend can
 * attest to. No display label: presentation is derived from collection config
 * by the engine, so implementations carry no presentation concerns.
 */
export type BackendEntryFile = {
  /** Where the entry is stored, relative to the repository or storage root. */
  path: string,
  /**
   * Revision identifier (blob sha, document version, ...) when the backend has
   * one. `null` is an explicit "this backend does not version content", which
   * is why it is distinct from the field being absent.
   */
  id?: string | null,
  /** Who last changed the entry. Backend-attested only; never fabricated. */
  author?: Author,
  /** ISO-8601 timestamp of the revision. */
  updatedOn?: string,
};

/** One entry as it crosses the backend seam. */
export type BackendEntry = {
  /** Where the entry came from, and what the backend knows about the revision. */
  file: BackendEntryFile,
  /**
   * The entry's content, in whichever form the backend holds it: raw text to
   * parse, or structured data to take as is. Exactly one variant, tagged by
   * `kind`.
   */
  content: BackendEntryContent,
};

/**
 * One file of an entry to write, as produced by the engine from a draft.
 * Physically still defined in `lib/util`; see the module README for the
 * relocation debt.
 */
export type DataFile = CmsDataFile;

/** A media file to write alongside an entry. */
export type Asset = CmsAssetProxy;

/** A media file as listed or returned by a backend. */
export type MediaFile = CmsImplementationMediaFile;

/**
 * Everything one persist writes: the entry's data files (one per locale for
 * i18n collections) and the media uploaded with it. Formerly `CmsFileEntry`.
 */
export type PersistPayload = {
  /** The entry itself, serialized: one file per locale for i18n collections. */
  dataFiles: DataFile[],
  /** Media uploaded while editing, to be written in the same operation. */
  assets: Asset[],
};

/** One file changed by an unpublished (editorial workflow) entry. */
export type UnpublishedEntryDiff = {
  /** Identifier for fetching this file's content (blob sha, document version, ...). */
  id: string,
  /** Path of the changed file, relative to the repository or storage root. */
  path: string,
  /** True when the change creates the file rather than modifying an existing one. */
  newFile: boolean,
};

/**
 * The workflow metadata for an entry that exists only as a pending change
 * (a PR/branch, a draft document). The content itself is fetched separately
 * via `unpublishedEntryDataFile`.
 */
export type UnpublishedEntry = {
  /** Slug the entry will have once published. */
  slug: string,
  /** Name of the collection the pending entry belongs to. */
  collection: string,
  /** Workflow status, one of the configured `publish_mode` statuses. */
  status: string,
  /** Every file the pending change touches, entry data and media alike. */
  diffs: UnpublishedEntryDiff[],
  /** ISO-8601 timestamp of the last change to the pending entry. */
  updatedAt: string,
  /** Who opened the pending change; was `pullRequestAuthor: string`. */
  author?: Author,
};

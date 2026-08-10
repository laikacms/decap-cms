import type { Author } from '@/lib/domain/index';
import type { CmsAssetProxy, CmsDataFile, CmsImplementationMediaFile } from '@/lib/util/index';
import type { BackendEntryContent } from './content';

/**
 * Where an entry came from, plus whatever revision metadata the backend can
 * attest to. No display label: presentation is derived from collection config
 * by the engine, so implementations carry no presentation concerns.
 */
export type BackendEntryFile = {
  path: string,
  /** Revision identifier (blob sha, document version, ...) when the backend has one. */
  id?: string | null,
  author?: Author,
  /** ISO-8601 timestamp of the revision. */
  updatedOn?: string,
};

/** One entry as it crosses the backend seam. */
export type BackendEntry = {
  file: BackendEntryFile,
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
  dataFiles: DataFile[],
  assets: Asset[],
};

/** One file changed by an unpublished (editorial workflow) entry. */
export type UnpublishedEntryDiff = {
  id: string,
  path: string,
  newFile: boolean,
};

/**
 * The workflow metadata for an entry that exists only as a pending change
 * (a PR/branch, a draft document). The content itself is fetched separately
 * via `unpublishedEntryDataFile`.
 */
export type UnpublishedEntry = {
  slug: string,
  collection: string,
  status: string,
  diffs: UnpublishedEntryDiff[],
  /** ISO-8601 timestamp of the last change to the pending entry. */
  updatedAt: string,
  /** Who opened the pending change; was `pullRequestAuthor: string`. */
  author?: Author,
};

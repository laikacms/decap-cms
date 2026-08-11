import type { CmsAssetProxy, CmsDataFile, CmsImplementationMediaFile } from '@/lib/util/index';

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
 * i18n collections) and the media uploaded with it.
 */
export type PersistPayload = {
  /** The entry itself, serialized: one file per locale for i18n collections. */
  dataFiles: DataFile[],
  /** Media uploaded while editing, to be written in the same operation. */
  assets: Asset[],
};

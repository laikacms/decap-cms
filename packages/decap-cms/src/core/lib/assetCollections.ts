import { trim } from 'lodash-es';

import type { CmsAssetCollection, CmsConfig } from '@/lib/util/index';

/**
 * Config-defined asset collections (DCMS-1412), or `[]` when the site config
 * doesn't declare any. Kept as a plain selector over `config.asset_collections`
 * (not a reducer slice) since the list itself is static config, mirroring how
 * `config.collections` is read directly rather than duplicated into state.
 */
export function selectAssetCollections(config: CmsConfig | undefined): CmsAssetCollection[] {
  return config?.asset_collections ?? [];
}

export function selectAssetCollectionByName(
  config: CmsConfig | undefined,
  name: string | undefined,
): CmsAssetCollection | undefined {
  if (!name) {
    return undefined;
  }
  return selectAssetCollections(config).find(collection => collection.name === name);
}

/**
 * Finds the asset collection whose `media_folder` is the closest ancestor of
 * (or equal to) `folder`, for scoping the media library's upload/section UI
 * when the user navigates into a collection's folder. Ties (a collection
 * folder appearing more than once) resolve to the first match in config
 * order. Returns `undefined` when `folder` isn't under any collection.
 */
export function selectAssetCollectionForFolder(
  config: CmsConfig | undefined,
  folder: string | undefined,
): CmsAssetCollection | undefined {
  const target = trim(folder ?? '', '/');
  if (!target) {
    return undefined;
  }

  let best: CmsAssetCollection | undefined;
  let bestLength = -1;
  for (const collection of selectAssetCollections(config)) {
    const base = trim(collection.media_folder, '/');
    const isMatch = target === base || target.startsWith(`${base}/`);
    if (isMatch && base.length > bestLength) {
      best = collection;
      bestLength = base.length;
    }
  }
  return best;
}

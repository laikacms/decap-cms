import { useMemo } from 'react';

import { boundGetAsset } from '@/core/actions/media';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { selectIsLoadingAsset } from '@/core/reducers/medias';

import type AssetProxy from '@/core/valueObjects/AssetProxy';
import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

export type GetAsset = (path: string, field?: CmsEntryField) => AssetProxy;

/**
 * The `getAsset` handed to widgets, previews and entry cards.
 *
 * `getAsset` answers from the asset cache (`state.medias`); for an asset that is
 * not cached yet it starts the load and returns the empty placeholder SVG.
 * Consumers resolve it in an effect keyed on this function's identity (DCMS-1036
 * moved the call out of render), so the identity has to change once the loads
 * settle - otherwise every image that was not cached at mount keeps showing the
 * empty placeholder for good. `boundGetAsset` is memoized per collection and
 * never changes on its own, so the identity here follows the "any asset loading"
 * flag, which drops back to false when the loads settle (success or failure).
 */
export function useGetAsset(collection: CmsCollectionState, entry: CmsEntry): GetAsset {
  const dispatch = useAppDispatch();
  const isLoadingAsset = useAppSelector((state: any) => selectIsLoadingAsset(state.medias));

  return useMemo<GetAsset>(
    () => {
      const bound = boundGetAsset(dispatch, collection, entry);
      return (path, field) => bound(path, field as CmsEntryField);
    },
    // - `isLoadingAsset` is not read here (`getAsset` reads the cache through the
    //   store); it is listed so a fresh function is handed out when loads settle.
    // - `entry` is left out: `boundGetAsset` keys on the collection and keeps the
    //   entry it was first bound with, so a later entry would change nothing but
    //   the identity - which would re-run every consumer's effect per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, collection, isLoadingAsset],
  );
}

import styled from '@emotion/styled';
import React from 'react';

import { overrideEntryLock } from '@/core/actions/entryLock';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/hooks/useTranslate';
import { selectEntryLock } from '@/core/reducers/selectors';
import { buttons, colors } from '@/ui/default/index';

import type { CmsCollectionState } from '@/lib/util/index';

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 4px;
  color: ${colors.warnText};
  background-color: ${colors.warnBackground};
  font-size: 14px;
`;

const OverrideButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  flex-shrink: 0;
`;

interface EntryLockBannerProps {
  collection: CmsCollectionState;
  slug: string;
}

/**
 * "Being edited by X" banner (DCMS-1414). Renders nothing unless the active
 * backend implements advisory entry locking AND another user currently
 * holds the lock — every other lock status (idle/checking/locked-by-me/
 * unsupported/error) is inert here, so this is a no-op for backends that
 * don't opt in.
 */
function EntryLockBanner({ collection, slug }: EntryLockBannerProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const lockEntry = useAppSelector(state => selectEntryLock(state, collection.name, slug));

  if (lockEntry.status !== 'locked-by-other') {
    return null;
  }

  const ownerName = lockEntry.lock?.owner.name ?? t('editor.editor.lockedByUnknown');

  return (
    <Banner role="status">
      <span>{t('editor.editor.lockedByOther', { name: ownerName })}</span>
      <OverrideButton
        type="button"
        onClick={() => {
          dispatch(overrideEntryLock(collection, slug) as any);
        }}
      >
        {t('editor.editor.lockOverride')}
      </OverrideButton>
    </Banner>
  );
}

export default EntryLockBanner;

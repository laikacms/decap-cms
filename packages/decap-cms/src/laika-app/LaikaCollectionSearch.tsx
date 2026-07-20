import styled from '@emotion/styled';
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useAppSelector } from '@/core/hooks/useRedux';
import { translate } from '@/core/i18n';
import { formatSequence } from '@/core/lib/shortcuts';
import { useLaikaShell } from './LaikaShellContext';
import { LaikaSearchTrigger } from './ui';

import type { CmsCollections } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Sidebar entry point for search. Looks like a search field but is a
 * button that opens LaikaCommandPalette (via the shell context), which is
 * the single search surface: typing there and pressing Enter runs the
 * same scoped/global entry search this component used to dispatch
 * directly. The label mirrors the palette's scoping: "search in
 * <collection>" on a `/collections/:name` route, "search all" elsewhere.
 * Shows the palette shortcut (⌘K on Apple platforms, Ctrl K otherwise).
 */

const Wrap = styled.div`
  margin: 0 4px 16px;
`;

interface LaikaCollectionSearchProps {
  t: TranslateFunction;
}

function LaikaCollectionSearch({ t }: LaikaCollectionSearchProps) {
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const isSearchEnabled = useAppSelector(state => state.config?.search !== false);
  const location = useLocation();
  const params = useParams();
  const { openCommandPalette } = useLaikaShell();

  if (!isSearchEnabled) {
    return null;
  }

  // Mirror the palette's scoping so the label promises what the palette
  // will offer first: an in-collection search on `/collections/:name`
  // routes, a global search everywhere else.
  const onCollectionRoute = location.pathname.startsWith('/collections/');
  const scopedCollectionName = onCollectionRoute ? (params.name as string | undefined) : undefined;
  const scopedCollection = scopedCollectionName ? collections?.[scopedCollectionName] : undefined;

  const label = scopedCollection
    ? t('collection.sidebar.searchIn') + ' ' + scopedCollection.label
    : t('collection.sidebar.searchAll');

  return (
    <Wrap>
      <LaikaSearchTrigger
        label={label}
        shortcut={formatSequence('mod+k')[0]}
        onClick={openCommandPalette}
        aria-label={label}
        aria-haspopup="dialog"
      />
    </Wrap>
  );
}

export default translate()(LaikaCollectionSearch);

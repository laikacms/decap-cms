/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { searchCollections } from '@/core/actions/collections';
import { useAppSelector } from '@/core/hooks/useRedux';
import { translate } from '@/core/i18n';
import { colors } from '@/ui/default/index';
import { LaikaSearchInput } from './ui';

import type { CmsCollections } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-side collection search. Lives in LaikaSidebar so it's accessible
 * from every page. On Enter, dispatches `searchCollections` from core,
 * which pushes either `/search/:query` (global) or
 * `/collections/:name/search/:query` (when scoped to a collection by
 * the current URL).
 */

const Wrap = styled.div`
  margin: 0 4px 16px;
`;

const ScopeHint = styled.div`
  font-size: 11px;
  font-weight: 500;
  margin-top: 6px;
  padding-left: 14px;
  color: ${colors.controlLabel};
`;

interface LaikaCollectionSearchProps {
  t: TranslateFunction;
}

function LaikaCollectionSearch({ t }: LaikaCollectionSearchProps) {
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const isSearchEnabled = useAppSelector(state => state.config?.search !== false);
  const location = useLocation();
  const params = useParams();

  const [query, setQuery] = React.useState('');

  if (!isSearchEnabled) {
    return null;
  }

  // Scope the search to the current collection when the URL is currently on
  // a `/collections/:name` route — otherwise search across all collections.
  const onCollectionRoute = location.pathname.startsWith('/collections/');
  const scopedCollectionName = onCollectionRoute ? (params.name as string | undefined) : undefined;
  const scopedCollection = scopedCollectionName ? collections?.[scopedCollectionName] : undefined;

  function handleSubmit(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || query.trim() === '') return;
    searchCollections(query.trim(), scopedCollectionName ?? '');
  }

  const placeholder = scopedCollection
    ? t('collection.sidebar.searchIn') + ' ' + scopedCollection.label
    : t('collection.sidebar.searchAll');

  return (
    <Wrap>
      <LaikaSearchInput
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={handleSubmit}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {scopedCollection
        ? (
          <ScopeHint>
            ↩ {t('collection.sidebar.searchIn')} {scopedCollection.label}
          </ScopeHint>
        )
        : null}
    </Wrap>
  );
}

export default translate()(LaikaCollectionSearch);

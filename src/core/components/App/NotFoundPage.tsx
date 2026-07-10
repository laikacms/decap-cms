import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';

import { lengths } from '../../../ui/default/index';

import type { TranslateFunction } from '../../../ui/default/index';

const NotFoundContainer = styled.div`
  margin: ${lengths.pageMargin};
`;

interface NotFoundPageProps {
  t: TranslateFunction;
  /**
   * Name of the collection slug the user tried to deep-link to, when this page
   * is rendered for an unknown collection route (DCMS-432) rather than a
   * generic unmatched path. Renders an extra line naming the missing
   * collection so the "not found" signal is specific, not just a bare 404.
   */
  collectionName?: string;
}

function NotFoundPage({ t, collectionName }: NotFoundPageProps) {
  return (
    <NotFoundContainer>
      <h2>{t('app.notFoundPage.header')}</h2>
      {collectionName && <p>{t('app.notFoundPage.collectionNotFound', { name: collectionName })}</p>}
    </NotFoundContainer>
  );
}

export default translate()(NotFoundPage);

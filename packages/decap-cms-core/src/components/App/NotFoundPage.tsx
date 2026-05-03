import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { lengths } from 'decap-cms-ui-default';

import type { TranslateFunction } from 'decap-cms-ui-default';

const NotFoundContainer = styled.div`
  margin: ${lengths.pageMargin};
`;

interface NotFoundPageProps {
  t: TranslateFunction;
}

function NotFoundPage({ t }: NotFoundPageProps) {
  return (
    <NotFoundContainer>
      <h2>{t('app.notFoundPage.header')}</h2>
    </NotFoundContainer>
  );
}

export default translate()(NotFoundPage);

import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import type { TranslateFunction } from 'decap-cms-ui-default';
import { lengths } from 'decap-cms-ui-default';
import PropTypes from 'prop-types';

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

NotFoundPage.propTypes = {
  t: PropTypes.func.isRequired,
};

export default translate()(NotFoundPage);

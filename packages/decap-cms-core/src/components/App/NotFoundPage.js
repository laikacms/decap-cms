import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { Link } from 'react-router-dom';
import { lengths } from 'decap-cms-ui-default';
import PropTypes from 'prop-types';

const NotFoundContainer = styled.div`
  margin: ${lengths.pageMargin};

  h1 {
    font-size: 28px;
    font-weight: 600;
  }
`;

export function NotFoundPage({ t, backLink, collectionName }) {
  const header = collectionName
    ? t('app.notFoundPage.collectionNotFoundHeader', { name: collectionName })
    : t('app.notFoundPage.header');
  return (
    <NotFoundContainer>
      <h1>{header}</h1>
      {backLink || <Link to="/">{t('app.notFoundPage.backToHome')}</Link>}
    </NotFoundContainer>
  );
}

NotFoundPage.propTypes = {
  t: PropTypes.func.isRequired,
  backLink: PropTypes.node,
  collectionName: PropTypes.string,
};

export default translate()(NotFoundPage);

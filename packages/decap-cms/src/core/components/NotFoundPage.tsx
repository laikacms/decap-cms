import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { Link } from '@/core/routing/Link';
import { colors, lengths } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

const NotFoundContainer = styled.div`
  margin: ${lengths.pageMargin};
`;

const BackLink = styled(Link)`
  color: ${colors.active};
  text-decoration: underline;

  &:focus-visible {
    outline: 2px solid ${colors.active};
    outline-offset: 2px;
  }
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
  /**
   * A specific failure message to show above the generic header copy, e.g. the
   * backend's "Entry not found: …" message (DCMS-445) surfaced when an entry
   * deep-link doesn't resolve within an otherwise-valid collection.
   */
  message?: string;
  /**
   * An in-app escape hatch back to the collection the failed route belongs to
   * (DCMS-445) — without it, a failed entry load has no click path back to
   * the collection list. Omitting `label` (e.g. for an unknown-collection
   * deep-link, where there's no known collection to name) renders a generic
   * "Back to home" link instead of "Back to <label>" (DCMS-1837).
   */
  backLink?: { to: string, label?: string };
}

function NotFoundPage({ t, collectionName, message, backLink }: NotFoundPageProps) {
  return (
    <NotFoundContainer>
      <h1>{t('app.notFoundPage.header')}</h1>
      {collectionName && <p>{t('app.notFoundPage.collectionNotFound', { name: collectionName })}</p>}
      {message && <p>{message}</p>}
      {backLink && (
        <p>
          <BackLink to={backLink.to}>
            {backLink.label
              ? t('app.notFoundPage.backToCollection', { name: backLink.label })
              : t('app.notFoundPage.backToHome')}
          </BackLink>
        </p>
      )}
    </NotFoundContainer>
  );
}

export default translate()(NotFoundPage);

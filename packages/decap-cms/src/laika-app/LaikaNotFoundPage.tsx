import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { colors } from '@/ui/default/index';
import { LaikaButton } from './ui';

import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled 404 page. Centered card with a back-to-dashboard CTA.
 */

const Page = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 420px;
  padding: 36px 28px;
  text-align: center;
`;

const ErrorMark = styled.div`
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: ${colors.active};
  background-color: ${colors.activeBackground};
  border-radius: 9999px;
  width: 96px;
  height: 96px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Body = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.controlLabel};
  line-height: 1.5;
`;

interface LaikaNotFoundPageProps {
  t: TranslateFunction;
}

function LaikaNotFoundPage({ t }: LaikaNotFoundPageProps) {
  return (
    <Page>
      <Card>
        <ErrorMark>404</ErrorMark>
        <Title>{t('app.notFoundPage.header')}</Title>
        <Body>The page you were looking for is not here.</Body>
        <LaikaButton to="/">Back to dashboard</LaikaButton>
      </Card>
    </Page>
  );
}

export default translate()(LaikaNotFoundPage);

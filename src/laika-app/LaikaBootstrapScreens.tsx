/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';

import { colors, lengths } from '../ui/default/index';
import { LaikaSpinner, LaikaButton } from './ui';

import type { TranslateFunction } from '../ui/default/index';

/**
 * Bootstrap screens slotted into `core.App` via `renderConfigLoading` and
 * `renderConfigError`. Both render full-screen so the user sees laika
 * branding even before the rest of the app boots.
 */

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background-color: ${colors.background};
  box-sizing: border-box;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 520px;
  padding: 36px 32px;
  text-align: center;
  background-color: ${colors.foreground};
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  box-shadow: var(--laika-shadow-strong, 0 24px 64px rgba(15, 23, 42, 0.08));
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

const ErrorMark = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: ${colors.errorBackground};
  color: ${colors.errorText};
  font-size: 28px;
  font-weight: 700;
`;

const ErrorCode = styled.pre`
  width: 100%;
  margin: 4px 0 0;
  padding: 12px;
  background-color: ${colors.background};
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  color: ${colors.errorText};
  font-size: 12px;
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 220px;
  overflow-y: auto;
`;

interface LaikaConfigLoadingProps {
  t: TranslateFunction;
}

function LaikaConfigLoadingInner({ t }: LaikaConfigLoadingProps) {
  return (
    <Page>
      <Card>
        <LaikaSpinner size="lg" />
        <Title>{t('app.app.loadingConfig')}</Title>
        <Body>Hang tight while we boot up the CMS.</Body>
      </Card>
    </Page>
  );
}

interface LaikaConfigErrorProps {
  error: string;
  t: TranslateFunction;
}

function LaikaConfigErrorInner({ error, t }: LaikaConfigErrorProps) {
  return (
    <Page>
      <Card>
        <ErrorMark>!</ErrorMark>
        <Title>{t('app.app.errorHeader')}</Title>
        <Body>
          <strong>{t('app.app.configErrors')}:</strong>
        </Body>
        <ErrorCode>{error}</ErrorCode>
        <Body>{t('app.app.checkConfigYml')}</Body>
        <LaikaButton variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </LaikaButton>
      </Card>
    </Page>
  );
}

export const LaikaConfigLoading = translate()(LaikaConfigLoadingInner);
export const LaikaConfigError = translate()(LaikaConfigErrorInner);


import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { colors, lengths } from '@/ui/default/index';
import { LaikaButton } from './ui';

import type { ErrorBoundaryRenderProps } from '@/core/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled crash fallback. Slotted into core's ErrorBoundary via the
 * `renderError` prop on the root `App`. Shows error mark + title + a link
 * to file a Github issue (URL pre-built by the boundary) + the stack
 * trace in a scrollable block + reload button. Backup JSON, when present,
 * is offered as a download instead of inline JSON dump.
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
  gap: 16px;
  max-width: 640px;
  width: 100%;
  padding: 32px;
  text-align: center;
  background-color: ${colors.foreground};
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  box-shadow: var(--laika-shadow-strong, 0 24px 64px rgba(15, 23, 42, 0.08));
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

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Body = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${colors.controlLabel};
`;

const ReportLink = styled.a`
  color: ${colors.active};
  font-weight: 600;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
`;

const Trace = styled.pre`
  width: 100%;
  margin: 0;
  padding: 12px;
  background-color: ${colors.background};
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  color: ${colors.errorText};
  font-size: 12px;
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 240px;
  overflow-y: auto;
`;

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const PrivacyNotice = styled.span`
  color: ${colors.errorText};
  font-size: 12px;
  font-weight: 500;
`;

function downloadBackup(backup: string) {
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'decap-cms-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface LaikaErrorScreenProps extends ErrorBoundaryRenderProps {
  t: TranslateFunction;
}

function LaikaErrorScreen({ errorMessage, issueUrl, backup, t }: LaikaErrorScreenProps) {
  return (
    <Page>
      <Card>
        <ErrorMark>!</ErrorMark>
        <Title>{t('ui.errorBoundary.title')}</Title>
        <Body>
          {t('ui.errorBoundary.details')}{' '}
          <ReportLink
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="issue-url"
          >
            {t('ui.errorBoundary.reportIt')}
          </ReportLink>
        </Body>
        <Body>
          {t('ui.errorBoundary.privacyWarning')
            .split('\n')
            .map((item, index) => (
              <PrivacyNotice key={index}>
                {item}
                <br />
              </PrivacyNotice>
            ))}
        </Body>
        <Title as="h2" style={{ fontSize: 16, marginTop: 8 }}>
          {t('ui.errorBoundary.detailsHeading')}
        </Title>
        <Trace>{errorMessage}</Trace>
        <Actions>
          <LaikaButton onClick={() => window.location.reload()}>Reload</LaikaButton>
          {backup
            ? (
              <LaikaButton variant="secondary" onClick={() => downloadBackup(backup)}>
                Download recovered draft
              </LaikaButton>
            )
            : null}
        </Actions>
      </Card>
    </Page>
  );
}

export default translate()(LaikaErrorScreen);

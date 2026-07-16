/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';

import { useAppSelector } from '@/core/hooks/useRedux';
import { colors } from '@/ui/default/index';
import { useLaikaTheme } from './LaikaThemeContext';
import { LaikaButton, LaikaCard, LaikaToggleSwitch } from './ui';

import type { LaikaThemeMode } from './laikaThemes';

/**
 * Laika-app settings page. Mounted at `/settings` via the `extraRoutes`
 * slot. Lets users pick a theme mode (light/dark/system) and surfaces
 * basic backend/config info.
 *
 * Pure laika - no core changes. State lives in `LaikaThemeContext`, which
 * persists the choice to localStorage; backend details are read from
 * Redux config state.
 */

const Page = styled.div`
  padding: 32px 8px;
  max-width: 720px;
`;

const Header = styled.header`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Subtle = styled.p`
  margin: 0;
  color: ${colors.controlLabel};
  font-size: 14px;
`;

const SectionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ThemeRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
`;

const ToggleLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ToggleTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.textLead};
`;

const ToggleHint = styled.span`
  font-size: 12px;
  color: ${colors.controlLabel};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;

  & + & {
    border-top: 1px solid ${colors.textFieldBorder};
  }
`;

const Label = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.textLead};
`;

const Value = styled.span`
  font-size: 13px;
  font-family: ${`SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace`};
  color: ${colors.controlLabel};
`;

const EXPLICIT_MODES: { value: Exclude<LaikaThemeMode, 'system'>, label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function LaikaSettingsPage() {
  const { mode, setMode } = useLaikaTheme();
  const config = useAppSelector(state => state.config) as
    | {
      site_name?: string,
      name?: string,
      backend?: { name?: string, repo?: string, branch?: string },
      publish_mode?: string,
    }
    | null
    | undefined;
  const version = typeof window !== 'undefined' && typeof window.DECAP_CMS_APP_VERSION === 'string'
    ? window.DECAP_CMS_APP_VERSION
    : undefined;

  return (
    <Page>
      <Header>
        <Title>Settings</Title>
        <Subtle>Preferences for this laika-cms session.</Subtle>
      </Header>
      <SectionGrid>
        <LaikaCard padding="20px">
          <LaikaCard.Header>
            <LaikaCard.Title>Appearance</LaikaCard.Title>
          </LaikaCard.Header>
          <LaikaCard.Body>Choose how laika-cms looks.</LaikaCard.Body>
          <ToggleRow>
            <ToggleLabel>
              <ToggleTitle>Match system theme</ToggleTitle>
              <ToggleHint>Follows your OS&apos;s light / dark preference automatically.</ToggleHint>
            </ToggleLabel>
            <LaikaToggleSwitch
              aria-label="Match system theme"
              checked={mode === 'system'}
              onCheckedChange={checked => setMode(checked ? 'system' : 'light')}
            />
          </ToggleRow>
          {mode !== 'system'
            ? (
              <ThemeRow>
                {EXPLICIT_MODES.map(option => (
                  <LaikaButton
                    key={option.value}
                    variant={mode === option.value ? 'primary' : 'secondary'}
                    onClick={() => setMode(option.value)}
                  >
                    {option.label}
                  </LaikaButton>
                ))}
              </ThemeRow>
            )
            : null}
        </LaikaCard>

        <LaikaCard padding="20px">
          <LaikaCard.Header>
            <LaikaCard.Title>Backend</LaikaCard.Title>
          </LaikaCard.Header>
          <Row>
            <Label>Site</Label>
            <Value>{config?.site_name ?? config?.name ?? '-'}</Value>
          </Row>
          <Row>
            <Label>Backend</Label>
            <Value>{config?.backend?.name ?? '-'}</Value>
          </Row>
          {config?.backend?.repo
            ? (
              <Row>
                <Label>Repository</Label>
                <Value>{config.backend.repo}</Value>
              </Row>
            )
            : null}
          {config?.backend?.branch
            ? (
              <Row>
                <Label>Branch</Label>
                <Value>{config.backend.branch}</Value>
              </Row>
            )
            : null}
          <Row>
            <Label>Publish mode</Label>
            <Value>{config?.publish_mode ?? 'simple'}</Value>
          </Row>
        </LaikaCard>

        <LaikaCard padding="20px">
          <LaikaCard.Header>
            <LaikaCard.Title>About</LaikaCard.Title>
          </LaikaCard.Header>
          <Row>
            <Label>Package</Label>
            <Value>laika-cms-app</Value>
          </Row>
          {version
            ? (
              <Row>
                <Label>Version</Label>
                <Value>{version}</Value>
              </Row>
            )
            : null}
        </LaikaCard>
      </SectionGrid>
    </Page>
  );
}

export default LaikaSettingsPage;

/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';

import { colors, lengths } from '../ui/default/index';

import type { AppAuthRenderProps } from '../core/index';

/**
 * Laika-flavored authentication page. Receives the backend-supplied
 * `AuthComponent` via `AppAuthRenderProps` (Decap's `renderAuth` slot) and
 * renders it inside a centered card with brand chrome — `site_url`/logo from
 * config, optional tagline, soft drop shadow.
 *
 * When `AuthComponent` is `null`, the backend is still resolving; we surface
 * a calm waiting state instead of the bare `<h1>Waiting for backend...</h1>`
 * that core falls back to.
 */

const Page = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background-color: ${colors.background};
  box-sizing: border-box;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  padding: 32px 28px;
  background-color: ${colors.foreground};
  border: 1px solid ${colors.textFieldBorder};
  border-radius: 16px;
  box-shadow: var(--laika-shadow-strong, 0 8px 32px rgba(15, 23, 42, 0.08));
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
`;

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
`;

const BrandLogo = styled.img`
  max-height: 56px;
  max-width: 200px;
  object-fit: contain;
`;

const BrandTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const BrandTagline = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.controlLabel};
`;

const AuthSlot = styled.div`
  /* The backend's AuthComponent supplies its own button styling; this wrapper
     just normalizes spacing inside the card. */
  display: flex;
  flex-direction: column;
  gap: ${lengths.borderRadius};
`;

const WaitingMessage = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.controlLabel};
  text-align: center;
`;

function deriveSiteName(config: AppAuthRenderProps['config']): string | undefined {
  const cfg = config as unknown as Record<string, unknown>;
  if (typeof cfg.site_name === 'string') return cfg.site_name as string;
  if (typeof cfg.name === 'string') return cfg.name as string;
  return undefined;
}

function deriveLogoUrl(config: AppAuthRenderProps['config']): string | undefined {
  const cfg = config as unknown as { logo?: { src?: string }; logo_url?: string };
  return cfg.logo?.src ?? cfg.logo_url;
}

export interface LaikaAuthenticationPageProps extends AppAuthRenderProps {
  /** Optional tagline rendered under the site name. */
  tagline?: string;
}

function LaikaAuthenticationPage({
  AuthComponent,
  onLogin,
  error,
  inProgress,
  config,
  clearHash,
  t,
  tagline,
}: LaikaAuthenticationPageProps) {
  const siteName = deriveSiteName(config);
  const logoUrl = deriveLogoUrl(config);

  return (
    <Page>
      <Card>
        <BrandBlock>
          {logoUrl ? <BrandLogo src={logoUrl} alt={siteName ?? 'CMS'} /> : null}
          <BrandTitle>{siteName ?? 'Content Manager'}</BrandTitle>
          {tagline ? <BrandTagline>{tagline}</BrandTagline> : null}
        </BrandBlock>
        <AuthSlot>
          {AuthComponent ? (
            <AuthComponent
              onLogin={onLogin}
              error={error}
              inProgress={inProgress}
              siteId={(config as { backend?: { site_domain?: string } }).backend?.site_domain}
              base_url={(config as { backend?: { base_url?: string } }).backend?.base_url}
              authEndpoint={
                (config as { backend?: { auth_endpoint?: string } }).backend?.auth_endpoint
              }
              config={config}
              clearHash={clearHash}
              t={t}
            />
          ) : (
            <WaitingMessage>{t('app.app.waitingBackend')}</WaitingMessage>
          )}
        </AuthSlot>
      </Card>
    </Page>
  );
}

export default LaikaAuthenticationPage;

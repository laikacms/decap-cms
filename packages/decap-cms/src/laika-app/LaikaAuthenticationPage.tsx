import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';

import {
  clearQrLoginCodeFromLocation,
  exchangeQrTransferCode,
  readQrLoginCodeFromLocation,
  resolveLaikaApiUrl,
} from '@/backends/laika/qrLogin';
import { colors, lengths } from '@/ui/default/index';

import type { AppAuthRenderProps } from '@/app/components/index';

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

const SessionNotice = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${colors.background};
  text-align: center;

  strong {
    font-size: 14px;
    color: ${colors.textLead};
  }

  span {
    font-size: 13px;
    line-height: 1.4;
    color: ${colors.controlLabel};
  }
`;

const QrErrorNotice = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background-color: ${colors.errorBackground};
  color: ${colors.errorText};
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
`;

/** Local state machine for an in-flight QR login code redemption (DCMS-1401). */
type QrExchangeState =
  | { status: 'idle' }
  | { status: 'exchanging' }
  | { status: 'error', message: string };

/**
 * Consumes a `laika_qr_login` code from the URL, if present: exchanges it
 * for a session via `exchangeQrTransferCode` and reports the credentials
 * back through `onLogin`, exactly as a completed PKCE flow would. The code
 * is single-use, so it is stripped from the URL on the very first read
 * regardless of outcome — a page refresh never resends it.
 *
 * Only meaningful for the `laika` backend (the only one this transfer-code
 * contract is defined for); any other backend name leaves the param
 * untouched-but-cleared and does nothing else.
 */
function useQrLoginExchange(
  config: AppAuthRenderProps['config'],
  onLogin: AppAuthRenderProps['onLogin'],
): QrExchangeState {
  const [state, setState] = useState<QrExchangeState>({ status: 'idle' });

  useEffect(() => {
    const code = readQrLoginCodeFromLocation();
    if (!code) return;

    const backendName = (config as unknown as { backend?: { name?: string } }).backend?.name;
    if (backendName !== 'laika') {
      clearQrLoginCodeFromLocation();
      return;
    }

    let cancelled = false;
    setState({ status: 'exchanging' });

    (async () => {
      try {
        const apiUrl = resolveLaikaApiUrl(
          config as unknown as { backend: { base_url: string, api_root?: string, api_url?: string } },
        );
        const credentials = await exchangeQrTransferCode(apiUrl, code);
        if (cancelled) return;
        clearQrLoginCodeFromLocation();
        onLogin(credentials);
      } catch (err) {
        if (cancelled) return;
        clearQrLoginCodeFromLocation();
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'QR login code could not be used.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: the code is single-use and gets stripped from
    // the URL on the first read, so re-running this on config/onLogin
    // identity churn would have nothing left to redeem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function deriveSiteName(config: AppAuthRenderProps['config']): string | undefined {
  const cfg = config as unknown as Record<string, unknown>;
  if (typeof cfg.site_name === 'string') return cfg.site_name as string;
  if (typeof cfg.name === 'string') return cfg.name as string;
  return undefined;
}

function deriveLogoUrl(config: AppAuthRenderProps['config']): string | undefined {
  const cfg = config as unknown as { logo?: { src?: string }, logo_url?: string };
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
  sessionExpired,
}: LaikaAuthenticationPageProps) {
  const siteName = deriveSiteName(config);
  const logoUrl = deriveLogoUrl(config);
  const qrExchange = useQrLoginExchange(config, onLogin);

  return (
    // Inside the session-expired overlay the scrim supplies the backdrop; a
    // solid page background would hide the (still mounted) app behind it.
    <Page style={sessionExpired ? { backgroundColor: 'transparent' } : undefined}>
      <Card>
        <BrandBlock>
          {logoUrl ? <BrandLogo src={logoUrl} alt={siteName ?? 'CMS'} /> : null}
          <BrandTitle>{siteName ?? 'Content Manager'}</BrandTitle>
          {tagline ? <BrandTagline>{tagline}</BrandTagline> : null}
        </BrandBlock>
        {sessionExpired
          ? (
            <SessionNotice>
              <strong>{t('app.app.sessionExpiredTitle')}</strong>
              <span>{t('app.app.sessionExpiredBody')}</span>
            </SessionNotice>
          )
          : null}
        {qrExchange.status === 'error'
          ? <QrErrorNotice>{qrExchange.message}</QrErrorNotice>
          : null}
        <AuthSlot>
          {qrExchange.status === 'exchanging'
            ? <WaitingMessage>Signing you in from your QR code...</WaitingMessage>
            : AuthComponent
            ? (
              <AuthComponent
                onLogin={onLogin}
                error={error}
                inProgress={inProgress}
                siteId={(config as { backend?: { site_domain?: string } }).backend?.site_domain}
                base_url={(config as { backend?: { base_url?: string } }).backend?.base_url}
                authEndpoint={(config as { backend?: { auth_endpoint?: string } }).backend?.auth_endpoint}
                config={config}
                clearHash={clearHash}
                t={t}
              />
            )
            : <WaitingMessage>{t('app.app.waitingBackend')}</WaitingMessage>}
        </AuthSlot>
      </Card>
    </Page>
  );
}

export default LaikaAuthenticationPage;

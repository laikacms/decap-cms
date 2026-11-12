import styled from '@emotion/styled';
import React from 'react';

import { AuthenticationPage, colors } from '@/ui/default/index';

import type { CmsConfig, CmsCredentials } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const ErrorMessage = styled.p`
  color: ${colors.errorText};
`;

const DEFAULT_TURBO_ADMIN_URL = 'https://turbo.decapcms.org';

const POPUP_MESSAGE_SOURCE = 'decap-turbo-login';

type FlatCredentials = {
  access_token?: string,
  refresh_token?: string,
  expires_at?: string | number,
  user_email?: string,
  user_name?: string,
  user_metadata?: string,
  dedicated_session?: string,
};

/** What a Turbo login hands `onLogin`: the Supabase session plus who signed in. */
export type TurboCredentials = CmsCredentials & {
  token: string,
  access_token: string,
  refresh_token: string,
  expires_at: number | undefined,
  user_email: string | undefined,
  email: string | undefined,
  user_name: string | undefined,
  user_metadata: Record<string, unknown>,
  dedicated_session: boolean,
};

// Turbo base64-encodes the UTF-8 JSON, and atob alone returns one character
// per byte, which garbles any non-ASCII name.
function decodeBase64Json(encoded: string) {
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// The field set both the popup message and the code exchange deliver.
export function credentialsFromFlatParams(credentials: FlatCredentials | null | undefined): TurboCredentials | null {
  if (!credentials || !credentials.access_token || !credentials.refresh_token) return null;

  let userMetadata: Record<string, unknown> = {};
  if (credentials.user_metadata) {
    try {
      userMetadata = decodeBase64Json(credentials.user_metadata);
    } catch {
      userMetadata = {};
    }
  }

  return {
    token: credentials.access_token,
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expires_at: Number(credentials.expires_at) || undefined,
    user_email: credentials.user_email || undefined,
    email: credentials.user_email || undefined,
    user_name: credentials.user_name || undefined,
    user_metadata: userMetadata,
    // '1' when Turbo minted this session for this CMS alone, so the backend's
    // logout may revoke it. Absent from older Turbo deploys: treated as shared.
    dedicated_session: credentials.dedicated_session === '1',
  };
}

// Login happens in a popup pointed at the Turbo admin app, which posts the
// resulting Supabase session back via `window.postMessage`. Only messages
// whose `event.origin` matches the configured `turbo_admin_url` origin are
// accepted (see `handlePopupMessage`): this is the security boundary for the
// whole flow, so it must never be relaxed (e.g. to `*`) when changing this.
function credentialsFromPostMessageData(data: unknown) {
  const message = data as { source?: unknown, credentials?: FlatCredentials } | null;
  if (!message || message.source !== POPUP_MESSAGE_SOURCE) return null;
  return credentialsFromFlatParams(message.credentials);
}

// Direct links from the Turbo profile page put a one-time exchange code (never
// the tokens) in the hash route: "#/?turbo_exchange_code=...&site_id=...".
function exchangeParamsFromLocationHash(hash: string) {
  const searchIndex = hash.indexOf('?');
  if (searchIndex === -1) return null;

  const params = new URLSearchParams(hash.slice(searchIndex + 1));
  const code = params.get('turbo_exchange_code');
  const siteId = params.get('site_id');
  if (!code || !siteId) return null;

  return { code, siteId };
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, '');
}

export interface TurboAuthenticationPageProps {
  onLogin: (credentials: TurboCredentials) => void;
  inProgress?: boolean | undefined;
  error?: React.ReactNode;
  config: CmsConfig;
  t: TranslateFunction;
  clearHash?: (() => void) | undefined;
}

/** The login page both Turbo backends render: a popup to Decap Turbo, or a one-time link from it. */
export default function TurboAuthenticationPage({
  onLogin,
  inProgress,
  error,
  config,
  t,
  clearHash,
}: TurboAuthenticationPageProps) {
  const [popupError, setPopupError] = React.useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = React.useState(false);
  const [exchangeError, setExchangeError] = React.useState<string | null>(null);
  const popupRef = React.useRef<Window | null>(null);
  const popupWatcherRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  // Read through a ref: the message listener and the exchange outlive renders.
  const onLoginRef = React.useRef(onLogin);
  onLoginRef.current = onLogin;

  const backendConfig = config.backend as typeof config.backend & {
    turbo_admin_url?: string,
    turbo_site_id?: string,
  };
  const turboAdminUrl = backendConfig.turbo_admin_url || DEFAULT_TURBO_ADMIN_URL;
  const siteId = backendConfig.turbo_site_id;

  const stopWatchingPopup = React.useCallback(() => {
    if (popupWatcherRef.current) {
      clearInterval(popupWatcherRef.current);
      popupWatcherRef.current = null;
    }
  }, []);

  const closePopup = React.useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }, []);

  React.useEffect(() => {
    const adminOrigin = new URL(turboAdminUrl).origin;

    function handlePopupMessage(event: MessageEvent) {
      if (event.origin !== adminOrigin) return;
      // Any Turbo page open in another window shares that origin; only the
      // popup this page opened may log it in.
      if (popupRef.current && event.source !== popupRef.current) return;

      const credentials = credentialsFromPostMessageData(event.data);
      if (!credentials) return;

      stopWatchingPopup();
      closePopup();
      setPopupError(null);
      setPopupBlocked(false);
      onLoginRef.current(credentials);
    }

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [turboAdminUrl, stopWatchingPopup, closePopup]);

  React.useEffect(
    () => () => {
      stopWatchingPopup();
      closePopup();
    },
    [stopWatchingPopup, closePopup],
  );

  // Redeems the one-time code for the session tokens in a POST body, never a URL.
  React.useEffect(() => {
    const exchangeParams = exchangeParamsFromLocationHash(window.location.hash);
    if (!exchangeParams) return;
    // Single-use, and the router must not see it.
    clearHash?.();

    const { code, siteId: exchangeSiteId } = exchangeParams;
    // site_id is repeated as a query param (in addition to the POST body)
    // because the CORS preflight carries no body: the server needs it there
    // to decide which site's admin URL to check the request's Origin against.
    const exchangeUrl = `${trimTrailingSlash(turboAdminUrl)}/auth/exchange?site_id=${
      encodeURIComponent(exchangeSiteId)
    }`;

    (async () => {
      try {
        const response = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, site_id: exchangeSiteId }),
        });
        const result = await response.json().catch(() => null);
        const credentials = response.ok && result?.ok ? credentialsFromFlatParams(result.credentials) : null;
        if (!credentials) {
          setExchangeError('This login link has expired. Please try again.');
          return;
        }
        onLoginRef.current(credentials);
      } catch {
        setExchangeError('Could not reach Turbo to complete login. Please try again.');
      }
    })();
    // Once, on mount: the code is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getTurboLoginUrl() {
    const redirectTo = `${window.location.origin}${window.location.pathname}?popup=1`;
    // The site lets Turbo check that the signed-in user is a member of the
    // site this origin belongs to before it mints a session for it.
    const siteParam = siteId ? `&site_id=${encodeURIComponent(siteId)}` : '';
    return `${trimTrailingSlash(turboAdminUrl)}/auth/decap-redirect?redirect_to=${
      encodeURIComponent(redirectTo)
    }${siteParam}`;
  }

  function handleTurboLogin() {
    setPopupError(null);
    setPopupBlocked(false);

    const popup = window.open(getTurboLoginUrl(), 'decap-turbo-login', 'width=480,height=640');
    if (!popup) {
      setPopupBlocked(true);
      return;
    }

    stopWatchingPopup();
    popupRef.current = popup;
    // No message is guaranteed if the user just closes the popup without
    // completing login: watch for that so the UI doesn't hang silently.
    popupWatcherRef.current = setInterval(() => {
      if (popup.closed) {
        stopWatchingPopup();
        popupRef.current = null;
        // The popup opened, so it was not blocked: keep any error already shown.
        setPopupError(current => current ?? 'Login was cancelled.');
      }
    }, 500);
  }

  return (
    <AuthenticationPage
      onLogin={handleTurboLogin}
      loginDisabled={inProgress}
      siteUrl={config.site_url}
      renderButtonContent={() => (inProgress ? t('auth.loggingIn') : 'Login with Turbo')}
      renderPageContent={() => (
        <>
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}
          {popupError ? <ErrorMessage>{popupError}</ErrorMessage> : null}
          {exchangeError ? <ErrorMessage>{exchangeError}</ErrorMessage> : null}
          {popupBlocked
            ? (
              <ErrorMessage>
                Your browser blocked the login popup. Please allow popups for this site and try again.
              </ErrorMessage>
            )
            : null}
        </>
      )}
      t={t}
    />
  );
}

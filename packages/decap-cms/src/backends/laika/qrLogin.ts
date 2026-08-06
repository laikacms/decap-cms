import { Url } from 'laikacms/core';

import { AccessTokenError, unsentRequest } from '@/lib/util/index';

import type { CmsCredentials as Credentials } from '@/lib/util/index';

/**
 * Client-side contract for Laika's QR-based "quick mobile access" login
 * (DCMS-1401, mirroring Sveltia CMS's QR-code-login parity item). An
 * already-authenticated session (typically desktop) mints a short-lived,
 * single-use transfer code; a second device (typically mobile, after
 * scanning the QR code laika-app renders) exchanges that code for its own
 * session without repeating the PKCE OAuth dance on a small screen.
 *
 * SCOPE CALL: this defines a NEW endpoint pair on the Laika API —
 * `POST {apiUrl}/session/transfer` (mint, authenticated) and
 * `POST {apiUrl}/session/transfer/exchange` (redeem, unauthenticated) — that
 * does not exist on any deployed backend yet. This decap-cms package only
 * owns the Decap-facing adapter (see `backends/laika/README.md`'s
 * "two-seam model" note); the laika-cloud API repo needs a matching
 * implementation before this is live end-to-end. Both the TTL and the
 * single-use invalidation are SERVER responsibilities — the client below
 * never reuses a code and never persists one past a single exchange attempt.
 */

/**
 * Requested TTL, in seconds, for a freshly minted transfer code. Scoped
 * call: long enough to unlock a phone and open the camera after glancing at
 * the screen, short enough that a shoulder-surfed QR code is useless a few
 * minutes later. The server is the source of truth for the actual expiry
 * (`expires_in` in the mint response) — this is only the requested value.
 */
export const QR_TRANSFER_CODE_TTL_SECONDS = 120;

/** Query param carrying the transfer code in the QR code's deep link. */
export const QR_LOGIN_QUERY_PARAM = 'laika_qr_login';

export interface QrTransferCode {
  code: string;
  /** Epoch ms this code stops being exchangeable (client-side estimate). */
  expiresAt: number;
}

interface TransferCodeResponse {
  data?: { attributes?: { code?: string, expires_in?: number } };
  code?: string;
  expires_in?: number;
}

interface TransferExchangeResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface LaikaBackendConfigLike {
  backend: {
    base_url: string;
    api_root?: string;
    api_url?: string;
  };
}

/**
 * Derives the Laika API root the same way `LaikaBackend`'s constructor does
 * (`base_url` combined with `api_root`, falling back to the legacy
 * `api_url` alias). Exposed standalone so `LaikaAuthenticationPage` — which
 * runs BEFORE a `LaikaBackend` instance exists for the current session — can
 * resolve the same URL to exchange an incoming QR login code.
 */
export function resolveLaikaApiUrl(config: LaikaBackendConfigLike): string {
  const baseUrl = Url.normalize(config.backend.base_url);
  return Url.combine(baseUrl, config.backend.api_root ?? config.backend.api_url);
}

/**
 * Mint a new transfer code from an authenticated session. Called from the
 * device that is ALREADY logged in (the one rendering the QR code).
 */
export async function requestQrTransferCode(
  apiUrl: string,
  accessToken: string,
): Promise<QrTransferCode> {
  const response = await unsentRequest.fetchWithTimeout(`${apiUrl}/session/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl: QR_TRANSFER_CODE_TTL_SECONDS }),
  });

  if (!response.ok) {
    throw new AccessTokenError(`Failed to create QR login transfer code (HTTP ${response.status})`);
  }

  const data = await response.json() as TransferCodeResponse;
  const attrs = data.data?.attributes ?? data;
  if (!attrs.code) {
    throw new AccessTokenError('QR login transfer response did not include a code');
  }

  const ttlSeconds = attrs.expires_in ?? QR_TRANSFER_CODE_TTL_SECONDS;
  return { code: attrs.code, expiresAt: Date.now() + ttlSeconds * 1000 };
}

/**
 * Exchange a transfer code for a fresh access/refresh token pair. Called
 * from the device that scanned the QR code — it has no session of its own
 * yet, so this call is unauthenticated (the code itself is the credential).
 *
 * Single-use: a code that was already redeemed (or has expired) is rejected
 * by the server. Callers must treat any failure as "fall back to a normal
 * login", never retry the same code.
 */
export async function exchangeQrTransferCode(apiUrl: string, code: string): Promise<Credentials> {
  const response = await unsentRequest.fetchWithTimeout(`${apiUrl}/session/transfer/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new AccessTokenError(`QR login code could not be exchanged (HTTP ${response.status})`);
  }

  const data = await response.json() as TransferExchangeResponse;
  if (!data.access_token) {
    throw new AccessTokenError('QR login exchange response did not include an access token');
  }

  // Matches the shape `LaikaBackend#authenticate` already accepts from the
  // PKCE flow (`token`/`refresh_token`/`expires_in`) — see laika-backend.ts.
  return {
    token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  } as unknown as Credentials;
}

/**
 * Builds the deep link the QR code encodes: the current app shell URL with
 * the transfer code attached as a query param (not a hash fragment, so a
 * server-rendered shell could read it before any client JS runs, if ever
 * needed). The scanning device just needs to load this URL —
 * `LaikaAuthenticationPage` picks the param up on mount and exchanges it
 * automatically.
 */
export function buildQrLoginDeepLink(code: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(QR_LOGIN_QUERY_PARAM, code);
  return url.toString();
}

/**
 * Reads (and does not mutate) the transfer code from the current URL, if
 * present.
 */
export function readQrLoginCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(QR_LOGIN_QUERY_PARAM);
}

/**
 * Strips the transfer code from the URL bar without a navigation/reload —
 * called after a redemption attempt (success or failure) so a page refresh
 * never resends an already-used code.
 */
export function clearQrLoginCodeFromLocation(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(QR_LOGIN_QUERY_PARAM);
  window.history.replaceState(null, '', url.toString());
}

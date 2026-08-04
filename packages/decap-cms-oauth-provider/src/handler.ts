import { buildAuthorizeUrl, exchangeCodeForToken, GitHubTokenExchangeError } from './github';
import { renderHandshakeHtml } from './html';
import { createNonce, InvalidStateError, signState, verifyState } from './state';

import type { GitHubOAuthConfig, OAuthHandler } from './types';

const DEFAULT_BASE_PATH = '/oauth';
const DEFAULT_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const PROVIDER = 'github';

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

function htmlHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    // The handshake page only ever talks to window.opener via postMessage
    // against an allowlisted, validated origin - it needs no framing/embeds.
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'",
    'X-Frame-Options': 'DENY',
  };
}

function jsonErrorResponse(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders() });
}

function requestOrigin(request: Request): string | undefined {
  const referer = request.headers.get('Referer') ?? request.headers.get('Origin');
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

/**
 * Creates a WinterCG fetch handler (`Request` in, `Response` out - no
 * platform-specific globals) that implements the GitHub OAuth Web
 * Application Flow for Decap CMS's GitHub backend. It replaces the
 * "separate Node auth server" self-hosters previously had to run, and is
 * deployable as-is to Cloudflare Workers, Vercel Edge, Netlify Edge, and
 * Deno via the thin wrappers in `./adapters/*`.
 *
 * Mirrors the shape used by the AI adapter's `decapAi(config)` factory:
 * a config object in, an object exposing a single `fetch(request)` method
 * out.
 */
export function createGitHubOAuthHandler(config: GitHubOAuthConfig): OAuthHandler {
  if (!config.clientId) throw new Error('createGitHubOAuthHandler: clientId is required');
  if (!config.clientSecret) throw new Error('createGitHubOAuthHandler: clientSecret is required');
  if (!config.stateSecret) throw new Error('createGitHubOAuthHandler: stateSecret is required');
  if (!config.allowedOrigins || config.allowedOrigins.length === 0) {
    throw new Error('createGitHubOAuthHandler: allowedOrigins must contain at least one origin');
  }

  const basePath = normalizePath(config.basePath ?? DEFAULT_BASE_PATH);
  const stateMaxAgeMs = config.stateMaxAgeMs ?? DEFAULT_STATE_MAX_AGE_MS;
  const authEndpoint = `${basePath}/auth`;
  const callbackEndpoint = `${basePath}/callback`;
  const healthEndpoint = `${basePath}/health`;

  function callbackUrl(request: Request): string {
    return new URL(callbackEndpoint, new URL(request.url).origin).toString();
  }

  async function handleAuth(request: Request): Promise<Response> {
    if (request.method !== 'GET') return jsonErrorResponse('Method not allowed', 405);

    const params = new URL(request.url).searchParams;
    const provider = params.get('provider');
    if (provider && provider !== PROVIDER) {
      return jsonErrorResponse(`Unsupported provider: ${provider}`, 400);
    }

    const origin = requestOrigin(request);
    if (!origin) {
      return jsonErrorResponse(
        'Missing Referer/Origin header; cannot determine return origin',
        400,
      );
    }
    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      return jsonErrorResponse(`Origin not allowed: ${origin}`, 403);
    }

    const state = await signState(
      { n: createNonce(), o: origin, t: Date.now() },
      config.stateSecret,
    );

    const authorizeUrl = buildAuthorizeUrl({
      clientId: config.clientId,
      redirectUri: callbackUrl(request),
      scope: params.get('scope') ?? config.scope,
      state,
      githubAuthorizeUrl: config.githubAuthorizeUrl,
    });

    return new Response(null, { status: 302, headers: { Location: authorizeUrl } });
  }

  async function handleCallback(request: Request): Promise<Response> {
    if (request.method !== 'GET') return jsonErrorResponse('Method not allowed', 405);

    const params = new URL(request.url).searchParams;
    const stateToken = params.get('state');
    if (!stateToken) return jsonErrorResponse('Missing state parameter', 400);

    let origin: string;
    try {
      origin = (await verifyState(stateToken, config.stateSecret, stateMaxAgeMs)).o;
    } catch (err) {
      if (err instanceof InvalidStateError) return jsonErrorResponse(err.message, 400);
      throw err;
    }
    // Re-check against the live allowlist, not just the signature: a config
    // rotation that shrinks allowedOrigins should immediately take effect
    // for in-flight logins too.
    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      return jsonErrorResponse(`Origin not allowed: ${origin}`, 403);
    }

    const oauthError = params.get('error');
    if (oauthError) {
      const description = params.get('error_description') ?? oauthError;
      return new Response(
        renderHandshakeHtml(PROVIDER, origin, 'error', { message: description }),
        {
          status: 200,
          headers: htmlHeaders(),
        },
      );
    }

    const code = params.get('code');
    if (!code) return jsonErrorResponse('Missing code parameter', 400);

    try {
      const { token, tokenType, scope } = await exchangeCodeForToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code,
        redirectUri: callbackUrl(request),
        githubTokenUrl: config.githubTokenUrl,
      });
      return new Response(
        renderHandshakeHtml(PROVIDER, origin, 'success', { token, token_type: tokenType, scope }),
        { status: 200, headers: htmlHeaders() },
      );
    } catch (err) {
      config.logger?.error('GitHub OAuth token exchange failed', err);
      const message =
        err instanceof GitHubTokenExchangeError ? err.message : 'Token exchange failed';
      return new Response(renderHandshakeHtml(PROVIDER, origin, 'error', { message }), {
        status: 200,
        headers: htmlHeaders(),
      });
    }
  }

  return {
    async fetch(request: Request): Promise<Response> {
      const pathname = normalizePath(new URL(request.url).pathname);

      if (pathname === healthEndpoint) {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          status: 200,
          headers: jsonHeaders(),
        });
      }
      if (pathname === authEndpoint) return handleAuth(request);
      if (pathname === callbackEndpoint) return handleCallback(request);

      return jsonErrorResponse(`Unknown endpoint: ${pathname}`, 404);
    },
  };
}

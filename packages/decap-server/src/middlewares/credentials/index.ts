import { timingSafeEqual } from 'crypto';

import type express from 'express';
import type winston from 'winston';

export type Options = {
  logger: winston.Logger;
};

export type CredentialLookup = (name: string) => string | undefined;

export type CredentialRequest = {
  authorization: string | undefined;
  name: string | undefined;
  expectedToken: string | undefined;
};

export type CredentialResponse =
  | { status: 200; body: { value: string } }
  | { status: 400 | 401 | 404 | 503; body: { error: string } };

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Buffers of different length would throw in timingSafeEqual; comparing
  // against a same-length buffer keeps this branch constant-time too.
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Reference implementation of the auth-gated credential channel described in
 * https://github.com/laikacms/decap-cms/issues/1416, for self-hosted setups
 * that pair `decap-server` with their own reverse-proxy/session auth. It's
 * intentionally a pure function so it's testable without spinning up an
 * express app or a real network call.
 *
 * Note: `decap-server`'s existing `local_backend` mode is a trusted-localhost
 * dev proxy with no login step of its own, so this endpoint authenticates
 * callers via a static bearer token (`DECAP_CREDENTIALS_TOKEN`) rather than a
 * backend OAuth session. A production deployment fronted by real backend
 * login (see #1413, edge-deployable auth handlers) should terminate auth
 * before proxying to an endpoint shaped like this one, or replace it outright
 * with an edge function that checks the real session.
 */
export function resolveCredentialRequest(
  request: CredentialRequest,
  lookup: CredentialLookup,
): CredentialResponse {
  const { authorization, name, expectedToken } = request;

  if (!expectedToken) {
    return { status: 503, body: { error: 'Credential store is not configured' } };
  }

  const [scheme, token] = (authorization || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || !safeEqual(token, expectedToken)) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  if (!name) {
    return { status: 400, body: { error: 'Missing "name" query parameter' } };
  }

  const value = lookup(name);
  if (typeof value !== 'string') {
    // Same response for "unset" and "unknown name" so this endpoint can't be
    // used to enumerate configured credential names.
    return { status: 404, body: { error: 'Credential not found' } };
  }

  return { status: 200, body: { value } };
}

function envKeyForCredential(name: string): string {
  return `DECAP_CREDENTIAL_${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
}

export function envCredentialLookup(name: string): string | undefined {
  return process.env[envKeyForCredential(name)];
}

export function registerMiddleware(app: express.Express, options: Options) {
  const { logger } = options;

  app.get('/credentials', (req, res) => {
    const result = resolveCredentialRequest(
      {
        authorization: req.get('authorization') ?? undefined,
        name: typeof req.query.name === 'string' ? req.query.name : undefined,
        expectedToken: process.env.DECAP_CREDENTIALS_TOKEN,
      },
      envCredentialLookup,
    );

    if (result.status !== 200) {
      // Log the outcome, never the requested name or (obviously) the value:
      // both could be sensitive and neither is needed to operate this route.
      logger.warn(`Credential request rejected with status ${result.status}`);
    }

    res.status(result.status).json(result.body);
  });
}

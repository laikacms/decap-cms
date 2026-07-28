import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url } from './base64url';

import type { StatePayload } from './types';

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Signs an OAuth `state` payload with HMAC-SHA256. The result is a compact,
 * self-contained, stateless token: `base64url(payload).base64url(signature)`.
 * No server-side session storage is required, which keeps the handler safe
 * to run on stateless/multi-region edge runtimes.
 */
export async function signState(payload: StatePayload, secret: string): Promise<string> {
  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export class InvalidStateError extends Error {}

/**
 * Verifies a `state` token produced by {@link signState}. Throws
 * {@link InvalidStateError} if the signature is wrong, the token is
 * malformed, or the token has expired.
 */
export async function verifyState(
  token: string,
  secret: string,
  maxAgeMs: number,
): Promise<StatePayload> {
  const parts = token.split('.');
  if (parts.length !== 2) throw new InvalidStateError('Malformed state token');
  const [encodedPayload, encodedSignature] = parts;

  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) throw new InvalidStateError('State signature mismatch');

  let payload: StatePayload;
  try {
    payload = JSON.parse(base64UrlToText(encodedPayload)) as StatePayload;
  } catch {
    throw new InvalidStateError('State payload is not valid JSON');
  }
  if (
    typeof payload.o !== 'string' ||
    typeof payload.n !== 'string' ||
    typeof payload.t !== 'number'
  ) {
    throw new InvalidStateError('State payload missing required fields');
  }
  if (Date.now() - payload.t > maxAgeMs) throw new InvalidStateError('State token expired');

  return payload;
}

/**
 * A small, auth-gated credential store.
 *
 * Some config values (stock photo / AI provider API keys, deploy hook URLs,
 * etc.) must never be world-readable next to the public `config.yml`. Rather
 * than embedding them in the public config, they're referenced by name
 * (`{ credential: 'name' }`, see `resolveCredentialRefs`) and fetched from
 * `config.credentials_url` on demand, using the backend auth token as proof
 * of login. Values are cached in memory only, are never written back into
 * `state.config`, and are never logged.
 */
import { currentBackend } from '../backend';

import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';
import type { State } from '../types/redux';

export const CREDENTIAL_REQUEST = 'CREDENTIAL_REQUEST';
export const CREDENTIAL_SUCCESS = 'CREDENTIAL_SUCCESS';
export const CREDENTIAL_FAILURE = 'CREDENTIAL_FAILURE';

export function credentialRequest(name: string) {
  return { type: CREDENTIAL_REQUEST, payload: { name } } as const;
}

export function credentialSuccess(name: string, value: string) {
  return { type: CREDENTIAL_SUCCESS, payload: { name, value } } as const;
}

export function credentialFailure(name: string, error: string) {
  return { type: CREDENTIAL_FAILURE, payload: { name, error } } as const;
}

export type CredentialAction = ReturnType<
  typeof credentialRequest | typeof credentialSuccess | typeof credentialFailure
>;

/**
 * Fetches a single named credential from `credentialsUrl`, authenticated
 * with the given `Authorization` header value. Split out so tests/hosts can
 * swap in a different transport without touching the gating logic below.
 */
export async function fetchCredential(
  credentialsUrl: string,
  name: string,
  authorization: string,
): Promise<string> {
  const url = new URL(
    credentialsUrl,
    typeof window !== 'undefined' ? window.location.href : undefined,
  );
  url.searchParams.set('name', name);

  const response = await fetch(url.toString(), {
    headers: { Authorization: authorization },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Failed to load credential "${name}" (${response.status})`);
  }

  const body = (await response.json()) as { value?: unknown };
  if (typeof body.value !== 'string') {
    throw new Error(`Credential store returned an invalid response for "${name}"`);
  }

  return body.value;
}

/**
 * Resolves a named credential, fetching and caching it on first use. Returns
 * `undefined` (and logs a warning, never the credential name's value) when
 * the store isn't configured or the user isn't authenticated yet, so callers
 * can fall back to omitting the feature rather than throwing.
 */
export function getCredential(name: string) {
  return async (
    dispatch: ThunkDispatch<State, {}, AnyAction>,
    getState: () => State,
  ): Promise<string | undefined> => {
    const state = getState();

    const cached = state.credentials[name];
    if (cached?.status === 'success') {
      return cached.value;
    }

    const credentialsUrl = state.config.credentials_url;
    if (!credentialsUrl) {
      console.warn(
        `Decap CMS: cannot resolve credential "${name}" — "credentials_url" is not configured`,
      );
      return undefined;
    }

    const backend = currentBackend(state.config);
    const token = await Promise.resolve(backend.getToken()).catch(() => null);
    if (!token || typeof token !== 'string') {
      console.warn(`Decap CMS: cannot resolve credential "${name}" before backend login`);
      return undefined;
    }

    dispatch(credentialRequest(name));
    try {
      const value = await fetchCredential(credentialsUrl, name, `Bearer ${token}`);
      dispatch(credentialSuccess(name, value));
      return value;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // Deliberately log only the failure message, never response bodies.
      console.warn(`Decap CMS: failed to resolve credential "${name}": ${message}`);
      dispatch(credentialFailure(name, message));
      return undefined;
    }
  };
}

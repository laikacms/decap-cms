/**
 * Walks a plain object/array structure (e.g. a media library's
 * `media_library.config`) and replaces any `{ credential: 'name' }` leaf with
 * the corresponding value resolved through the credential store
 * (`actions/credentials.ts`). Unresolved references (store not configured,
 * user not logged in yet, fetch failure) are dropped rather than left as the
 * raw `{ credential }` object, so a secret's *name* never leaks into whatever
 * consumes the resolved value.
 */
import { getCredential } from '../actions/credentials';

import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';
import type { State, CmsCredentialRef } from '../types/redux';

export function isCredentialRef(value: unknown): value is CmsCredentialRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).credential === 'string' &&
    Object.keys(value as Record<string, unknown>).length === 1
  );
}

export async function resolveCredentialRefs<T>(
  dispatch: ThunkDispatch<State, {}, AnyAction>,
  value: T,
): Promise<T> {
  if (isCredentialRef(value)) {
    const resolved = await dispatch(getCredential(value.credential));
    return resolved as unknown as T;
  }

  if (Array.isArray(value)) {
    const resolved = await Promise.all(value.map(item => resolveCredentialRefs(dispatch, item)));
    return resolved as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [
        key,
        await resolveCredentialRefs(dispatch, item),
      ]),
    );
    return Object.fromEntries(entries) as unknown as T;
  }

  return value;
}

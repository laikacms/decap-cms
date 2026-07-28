import { produce } from 'immer';

import { CREDENTIAL_REQUEST, CREDENTIAL_SUCCESS, CREDENTIAL_FAILURE } from '../actions/credentials';

import type { CredentialAction } from '../actions/credentials';

export type CredentialEntry = {
  status: 'loading' | 'success' | 'error';
  value?: string;
  error?: string;
};

export type CredentialsState = Record<string, CredentialEntry>;

const defaultState: CredentialsState = {};

const credentials = produce((state: CredentialsState, action: CredentialAction) => {
  switch (action.type) {
    case CREDENTIAL_REQUEST:
      state[action.payload.name] = { status: 'loading' };
      break;
    case CREDENTIAL_SUCCESS:
      state[action.payload.name] = { status: 'success', value: action.payload.value };
      break;
    case CREDENTIAL_FAILURE:
      state[action.payload.name] = { status: 'error', error: action.payload.error };
      break;
  }
}, defaultState);

export default credentials;

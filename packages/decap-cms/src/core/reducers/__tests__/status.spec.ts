import { describe, expect, it } from 'vitest';

import { statusFailure, statusRequest, statusSuccess } from '@/core/actions/status';
import status from '@/core/reducers/status';

import type { StatusAction } from '@/core/actions/status';
import type { Status } from '@/core/reducers/status';

const defaultState: Status = {
  isFetching: false,
  status: {
    auth: { status: true },
    api: { status: true, statusPage: '' },
  },
  error: undefined,
};

describe('status', () => {
  it('should return the default state', () => {
    expect(status(undefined, {} as unknown as StatusAction)).toEqual(defaultState);
  });

  it('should set isFetching to true on STATUS_REQUEST', () => {
    const state = status(undefined, statusRequest());
    expect(state.isFetching).toBe(true);
  });

  it('should preserve the previous status while a STATUS_REQUEST is in flight', () => {
    const requestedState = status(undefined, statusRequest());
    const state = status(requestedState, statusRequest());
    expect(state).toEqual({ ...defaultState, isFetching: true });
  });

  it('should set isFetching to false and update status on STATUS_SUCCESS', () => {
    const requestedState = status(undefined, statusRequest());
    const newStatus = {
      auth: { status: false },
      api: { status: false, statusPage: 'https://status.example.com' },
    };
    const state = status(requestedState, statusSuccess(newStatus));

    expect(state.isFetching).toBe(false);
    expect(state.status).toEqual(newStatus);
  });

  it('should not touch the error field on STATUS_SUCCESS', () => {
    const error = new Error('previous failure');
    const failedState = status(undefined, statusFailure(error));
    const newStatus = {
      auth: { status: true },
      api: { status: true, statusPage: '' },
    };
    const state = status(failedState, statusSuccess(newStatus));

    expect(state.error).toBe(error);
    expect(state.status).toEqual(newStatus);
  });

  it('should set isFetching to false and set error on STATUS_FAILURE', () => {
    const requestedState = status(undefined, statusRequest());
    const error = new Error('network error');
    const state = status(requestedState, statusFailure(error));

    expect(state.isFetching).toBe(false);
    expect(state.error).toBe(error);
  });

  it('should not touch the status field on STATUS_FAILURE', () => {
    const newStatus = {
      auth: { status: false },
      api: { status: false, statusPage: 'https://status.example.com' },
    };
    const successState = status(undefined, statusSuccess(newStatus));
    const error = new Error('network error');
    const state = status(successState, statusFailure(error));

    expect(state.status).toEqual(newStatus);
    expect(state.error).toBe(error);
  });

  it('should return the same state for an unrecognized action', () => {
    const state = status(undefined, { type: 'UNKNOWN_ACTION' } as unknown as StatusAction);
    expect(state).toEqual(defaultState);
  });
});

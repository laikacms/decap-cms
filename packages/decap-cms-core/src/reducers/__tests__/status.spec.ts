import { statusRequest, statusSuccess, statusFailure } from '../../actions/status';
import status from '../status';

import type { Status } from '../status';
import type { StatusAction } from '../../actions/status';

const defaultState: Status = {
  isFetching: false,
  status: {
    auth: { status: true },
    api: { status: true, statusPage: '' },
  },
  error: undefined,
};

describe('status reducer', () => {
  it('should return the default state', () => {
    expect(status(undefined, {} as unknown as StatusAction)).toEqual(defaultState);
  });

  it('should set isFetching to true on STATUS_REQUEST without changing status or error', () => {
    const state = status(undefined, statusRequest() as unknown as StatusAction);
    expect(state.isFetching).toBe(true);
    expect(state.status).toEqual(defaultState.status);
    expect(state.error).toBeUndefined();
  });

  it('should set isFetching to false and update status on STATUS_SUCCESS', () => {
    const newStatus = {
      auth: { status: false },
      api: { status: false, statusPage: 'https://status.example.com' },
    };
    const fetching = status(undefined, statusRequest() as unknown as StatusAction);
    const state = status(fetching, statusSuccess(newStatus) as unknown as StatusAction);
    expect(state.isFetching).toBe(false);
    expect(state.status).toEqual(newStatus);
  });

  it('should set isFetching to false and store error on STATUS_FAILURE', () => {
    const error = new Error('backend unreachable');
    const fetching = status(undefined, statusRequest() as unknown as StatusAction);
    const state = status(fetching, statusFailure(error) as unknown as StatusAction);
    expect(state.isFetching).toBe(false);
    expect(state.error).toBe(error);
  });
});

import { statusRequest, statusSuccess, statusFailure } from '../../actions/status';
import status from '../status';

import type { Status } from '../status';

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore reducer does not accept empty action
    expect(status(undefined, {})).toEqual(defaultState);
  });

  it('should set isFetching to true on STATUS_REQUEST without changing status or error', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = status(undefined, statusRequest());
    expect(state.isFetching).toBe(true);
    expect(state.status).toEqual(defaultState.status);
    expect(state.error).toBeUndefined();
  });

  it('should set isFetching to false and update status on STATUS_SUCCESS', () => {
    const newStatus = {
      auth: { status: false },
      api: { status: false, statusPage: 'https://status.example.com' },
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const fetching = status(undefined, statusRequest());
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = status(fetching, statusSuccess(newStatus));
    expect(state.isFetching).toBe(false);
    expect(state.status).toEqual(newStatus);
  });

  it('should set isFetching to false and store error on STATUS_FAILURE', () => {
    const error = new Error('backend unreachable');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const fetching = status(undefined, statusRequest());
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = status(fetching, statusFailure(error));
    expect(state.isFetching).toBe(false);
    expect(state.error).toBe(error);
  });
});

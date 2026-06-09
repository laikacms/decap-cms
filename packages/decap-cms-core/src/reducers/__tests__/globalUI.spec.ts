import { USE_OPEN_AUTHORING } from '../../actions/auth';
import globalUI from '../globalUI';

import type { GlobalUI } from '../globalUI';

const defaultState: GlobalUI = {
  isFetching: false,
  useOpenAuthoring: false,
};

describe('globalUI reducer', () => {
  it('should return the default state', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    expect(globalUI(undefined, { type: '@@INIT' })).toEqual(defaultState);
  });

  it('should set isFetching to true on a REQUEST action not in the ignore list', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(undefined, { type: 'SOME_REQUEST' });
    expect(state.isFetching).toBe(true);
    expect(state.useOpenAuthoring).toBe(false);
  });

  it('should set isFetching to false on a SUCCESS action not in the ignore list', () => {
    const fetching: GlobalUI = { ...defaultState, isFetching: true };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(fetching, { type: 'SOME_SUCCESS' });
    expect(state.isFetching).toBe(false);
  });

  it('should set isFetching to false on a FAILURE action not in the ignore list', () => {
    const fetching: GlobalUI = { ...defaultState, isFetching: true };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(fetching, { type: 'SOME_FAILURE' });
    expect(state.isFetching).toBe(false);
  });

  it('should NOT change isFetching for a DEPLOY_PREVIEW_REQUEST action (in ignore list)', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(undefined, { type: 'DEPLOY_PREVIEW_REQUEST' });
    expect(state.isFetching).toBe(false);
  });

  it('should NOT change isFetching for a STATUS_REQUEST action (in ignore list)', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(undefined, { type: 'STATUS_REQUEST' });
    expect(state.isFetching).toBe(false);
  });

  it('should NOT change isFetching for a STATUS_SUCCESS action (in ignore list)', () => {
    const fetching: GlobalUI = { ...defaultState, isFetching: true };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(fetching, { type: 'STATUS_SUCCESS' });
    expect(state.isFetching).toBe(true);
  });

  it('should NOT change isFetching for a STATUS_FAILURE action (in ignore list)', () => {
    const fetching: GlobalUI = { ...defaultState, isFetching: true };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(fetching, { type: 'STATUS_FAILURE' });
    expect(state.isFetching).toBe(true);
  });

  it('should set useOpenAuthoring to true on USE_OPEN_AUTHORING', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(undefined, { type: USE_OPEN_AUTHORING });
    expect(state.useOpenAuthoring).toBe(true);
    expect(state.isFetching).toBe(false);
  });

  it('should not affect useOpenAuthoring on unrelated actions', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore plain action object
    const state = globalUI(undefined, { type: 'SOME_REQUEST' });
    expect(state.useOpenAuthoring).toBe(false);
  });
});

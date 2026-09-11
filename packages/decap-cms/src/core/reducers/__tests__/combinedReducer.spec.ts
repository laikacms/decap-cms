import { describe, expect, it } from 'vitest';

import { statusRequest } from '@/core/actions/status';
import createRootReducer from '@/core/reducers/combinedReducer';

describe('combinedReducer', () => {
  it('returns a reducer function', () => {
    const rootReducer = createRootReducer();
    expect(typeof rootReducer).toBe('function');
  });

  it('produces a state object containing every expected top-level slice key on init', () => {
    const rootReducer = createRootReducer();
    const state = rootReducer(undefined, { type: '@@INIT' });

    expect(Object.keys(state).sort()).toEqual(
      [
        'auth',
        'config',
        'collections',
        'search',
        'integrations',
        'entries',
        'cursors',
        'editorialWorkflow',
        'entryDraft',
        'entryLock',
        'medias',
        'mediaLibrary',
        'deploys',
        'globalUI',
        'status',
        'notifications',
      ].sort(),
    );
  });

  it('dispatching a representative action updates only its own slice, leaving others referentially unchanged', () => {
    const rootReducer = createRootReducer();
    const initialState = rootReducer(undefined, { type: '@@INIT' });

    const nextState = rootReducer(initialState, statusRequest());

    expect(nextState.status).not.toBe(initialState.status);
    expect(nextState.status.isFetching).toBe(true);

    const otherKeys = (Object.keys(initialState) as Array<keyof typeof initialState>).filter(
      key => key !== 'status',
    );
    otherKeys.forEach(key => {
      expect(nextState[key]).toBe(initialState[key]);
    });
  });
});

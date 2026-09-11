import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

import { authenticateUser, loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
import { currentBackend } from '@/core/backend';
import { sessionListener } from '@/core/redux/middleware/sessionListener';

vi.mock('@/core/backend', () => ({
  currentBackend: vi.fn(),
}));

const mockedCurrentBackend = vi.mocked(currentBackend);

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

// The listener's cleanup (event listener removal) happens in the `finally`
// of its effect, which only settles a microtask after `condition()`
// resolves — so tests that stop the watcher need to flush microtasks before
// asserting no further refreshes happen.
function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createTestStore(configState: unknown = { isFetching: false, error: undefined }) {
  const reducer = (state = { config: configState }) => state;
  return configureStore({
    reducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(sessionListener.middleware),
  });
}

describe('sessionListener middleware', () => {
  let ensureFreshSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setVisibility('visible');
    ensureFreshSession = vi.fn();
    mockedCurrentBackend.mockReturnValue({ ensureFreshSession } as unknown as ReturnType<typeof currentBackend>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts the watcher on loginUser.fulfilled and refreshes on regained connectivity', () => {
    const store = createTestStore();

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).toHaveBeenCalledTimes(1);

    store.dispatch({ type: logoutUser.pending.type });
  });

  it('does not start a watcher for authenticateUser.fulfilled when there is no stored session', () => {
    const store = createTestStore();

    store.dispatch({ type: authenticateUser.fulfilled.type, payload: null });
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).not.toHaveBeenCalled();
  });

  it('stops the watcher on logoutUser.pending, so a later connectivity regain no longer refreshes', async () => {
    const store = createTestStore();

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });
    store.dispatch({ type: logoutUser.pending.type });
    await flushMicrotasks();
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).not.toHaveBeenCalled();
  });

  it('stops the watcher on session-expired, so a later connectivity regain no longer refreshes', async () => {
    const store = createTestStore();

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });
    store.dispatch({ type: sessionExpired.type });
    await flushMicrotasks();
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).not.toHaveBeenCalled();
  });

  it('refreshes when the tab becomes visible again', () => {
    const store = createTestStore();

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(ensureFreshSession).toHaveBeenCalledTimes(1);

    store.dispatch({ type: logoutUser.pending.type });
  });

  it('does not refresh while the tab is hidden', () => {
    const store = createTestStore();

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).not.toHaveBeenCalled();

    store.dispatch({ type: logoutUser.pending.type });
  });

  it('does not refresh on connectivity regain while config is still fetching', () => {
    const store = createTestStore({ isFetching: true, error: undefined });

    store.dispatch({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });
    window.dispatchEvent(new Event('online'));

    expect(ensureFreshSession).not.toHaveBeenCalled();

    store.dispatch({ type: logoutUser.pending.type });
  });
});

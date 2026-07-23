import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import { currentBackend } from '../../backend';
import statusReducer from '../../reducers/status';
import notificationsReducer from '../../reducers/notifications';
import { checkBackendStatus } from '../status';

jest.mock('../../backend');

function createTestStore() {
  const rootReducer = combineReducers({
    status: statusReducer,
    notifications: notificationsReducer,
    // checkBackendStatus only forwards this to the (mocked) currentBackend
    // resolver, so its shape is irrelevant here.
    config: (state = {}) => state,
  });
  return createStore(rootReducer, applyMiddleware(thunk));
}

function downNotifications(store: ReturnType<typeof createTestStore>) {
  return store
    .getState()
    .notifications.notifications.filter(
      (n: { message: unknown }) =>
        typeof n.message !== 'string' &&
        (n.message as { key?: string })?.key === 'ui.toast.onBackendDown',
    );
}

function authNotifications(store: ReturnType<typeof createTestStore>) {
  return store
    .getState()
    .notifications.notifications.filter(
      (n: { message: unknown }) =>
        typeof n.message !== 'string' &&
        (n.message as { key?: string })?.key === 'ui.toast.onLoggedOut',
    );
}

describe('checkBackendStatus()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches a single backend-down notification and dedups on repeat failures', async () => {
    const backend = {
      status: jest.fn().mockResolvedValue({
        auth: { status: true },
        api: { status: false, statusPage: 'https://status.example.com' },
      }),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const store = createTestStore();

    await store.dispatch(checkBackendStatus() as never);
    expect(downNotifications(store)).toHaveLength(1);

    await store.dispatch(checkBackendStatus() as never);
    expect(backend.status).toHaveBeenCalledTimes(2);
    expect(downNotifications(store)).toHaveLength(1);
  });

  it('dismisses the prior backend-down notification once the backend recovers', async () => {
    const backend = {
      status: jest
        .fn()
        .mockResolvedValueOnce({
          auth: { status: true },
          api: { status: false, statusPage: 'https://status.example.com' },
        })
        .mockResolvedValueOnce({
          auth: { status: true },
          api: { status: true, statusPage: 'https://status.example.com' },
        }),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const store = createTestStore();

    await store.dispatch(checkBackendStatus() as never);
    expect(downNotifications(store)).toHaveLength(1);

    await store.dispatch(checkBackendStatus() as never);
    expect(downNotifications(store)).toHaveLength(0);
  });

  it('dispatches the auth-error notification only on the first failure', async () => {
    const backend = {
      status: jest.fn().mockResolvedValue({
        auth: { status: false },
        api: { status: true, statusPage: 'https://status.example.com' },
      }),
    };
    (currentBackend as jest.Mock).mockReturnValue(backend);

    const store = createTestStore();

    await store.dispatch(checkBackendStatus() as never);
    expect(authNotifications(store)).toHaveLength(1);

    await store.dispatch(checkBackendStatus() as never);
    expect(backend.status).toHaveBeenCalledTimes(2);
    expect(authNotifications(store)).toHaveLength(1);
  });
});

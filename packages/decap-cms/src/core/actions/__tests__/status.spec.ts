import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkBackendStatus,
  STATUS_FAILURE,
  STATUS_REQUEST,
  STATUS_SUCCESS,
} from '@/core/actions/status';
import { NOTIFICATION_DISMISS, NOTIFICATION_SEND } from '@/core/actions/notifications';
import * as backendModule from '@/core/backend';

vi.mock('../../backend');

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const upStatus = {
  auth: { status: true },
  api: { status: true, statusPage: 'https://status.example.com' },
};

describe('status actions', () => {
  const currentBackend = vi.mocked(backendModule.currentBackend);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkBackendStatus', () => {
    it('dispatches statusRequest then statusSuccess on a normal successful check', async () => {
      const statusMock = vi.fn().mockResolvedValue(upStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: { notifications: [] },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(statusMock).toHaveBeenCalled();
      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        { type: STATUS_SUCCESS, payload: { status: upStatus } },
      ]);
    });

    it('is a no-op when a status check is already in flight', async () => {
      const statusMock = vi.fn().mockResolvedValue(upStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: true },
        config: {},
        notifications: { notifications: [] },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(statusMock).not.toHaveBeenCalled();
      expect(store.getActions()).toEqual([]);
    });

    it('dispatches an onBackendDown notification once when the api goes down', async () => {
      const downStatus = {
        auth: { status: true },
        api: { status: false, statusPage: 'https://status.example.com' },
      };
      const statusMock = vi.fn().mockResolvedValue(downStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: { notifications: [] },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        {
          type: NOTIFICATION_SEND,
          payload: {
            message: { details: downStatus.api.statusPage, key: 'ui.toast.onBackendDown' },
            type: 'error',
          },
        },
        { type: STATUS_SUCCESS, payload: { status: downStatus } },
      ]);
    });

    it('does not dispatch a duplicate onBackendDown notification when one already exists', async () => {
      const downStatus = {
        auth: { status: true },
        api: { status: false, statusPage: 'https://status.example.com' },
      };
      const statusMock = vi.fn().mockResolvedValue(downStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: {
          notifications: [
            { id: 'existing-down', message: { key: 'ui.toast.onBackendDown' }, type: 'error' },
          ],
        },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        { type: STATUS_SUCCESS, payload: { status: downStatus } },
      ]);
    });

    it('dismisses existing onBackendDown notifications when the backend recovers', async () => {
      const statusMock = vi.fn().mockResolvedValue(upStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: {
          notifications: [
            { id: 'existing-down', message: { key: 'ui.toast.onBackendDown' }, type: 'error' },
          ],
        },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        { type: NOTIFICATION_DISMISS, id: 'existing-down' },
        { type: STATUS_SUCCESS, payload: { status: upStatus } },
      ]);
    });

    it('dispatches an onLoggedOut notification once when auth status is false', async () => {
      const authDownStatus = {
        auth: { status: false },
        api: { status: true, statusPage: 'https://status.example.com' },
      };
      const statusMock = vi.fn().mockResolvedValue(authDownStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: { notifications: [] },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        {
          type: NOTIFICATION_SEND,
          payload: { message: { key: 'ui.toast.onLoggedOut' }, type: 'error' },
        },
        { type: STATUS_SUCCESS, payload: { status: authDownStatus } },
      ]);
    });

    it('does not dispatch a duplicate onLoggedOut notification when one already exists', async () => {
      const authDownStatus = {
        auth: { status: false },
        api: { status: true, statusPage: 'https://status.example.com' },
      };
      const statusMock = vi.fn().mockResolvedValue(authDownStatus);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: {
          notifications: [
            { id: 'existing-logged-out', message: { key: 'ui.toast.onLoggedOut' }, type: 'error' },
          ],
        },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        { type: STATUS_SUCCESS, payload: { status: authDownStatus } },
      ]);
    });

    it('dispatches statusFailure when backend.status() throws', async () => {
      const error = new Error('network unreachable');
      const statusMock = vi.fn().mockRejectedValue(error);
      currentBackend.mockReturnValue({ status: statusMock } as any);
      const store = mockStore({
        status: { isFetching: false },
        config: {},
        notifications: { notifications: [] },
      });

      await store.dispatch(checkBackendStatus() as any);

      expect(store.getActions()).toEqual([
        { type: STATUS_REQUEST },
        { type: STATUS_FAILURE, payload: { error } },
      ]);
    });
  });
});

import { v4 as uuidMock } from 'uuid';

import {
  addNotification,
  clearNotifications,
  dismissNotification,
} from '../../actions/notifications';
import notifications from '../notifications';

import type { NotificationsState } from '../notifications';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const mockedUuid = uuidMock as jest.MockedFunction<typeof uuidMock>;

const defaultState: NotificationsState = {
  notifications: [],
};

describe('notifications', () => {
  beforeEach(() => {
    mockedUuid.mockReturnValue('mock-uuid');
  });

  it('should return empty notifications array as default state', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore notifications reducer doesn't accept empty action
    expect(notifications(undefined, {})).toEqual(defaultState);
  });

  it('should append a notification on NOTIFICATION_SEND', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = notifications(
      undefined,
      addNotification({ message: 'Hello world', type: 'success' }),
    );
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({
      id: 'mock-uuid',
      message: 'Hello world',
      type: 'success',
    });
  });

  it('should append a notification with dismissAfter on NOTIFICATION_SEND', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = notifications(
      undefined,
      addNotification({ message: 'Auto dismiss', type: 'info', dismissAfter: 3000 }),
    );
    expect(state.notifications[0]).toMatchObject({
      id: 'mock-uuid',
      message: 'Auto dismiss',
      type: 'info',
      dismissAfter: 3000,
    });
  });

  it('should remove only the matching notification on NOTIFICATION_DISMISS', () => {
    mockedUuid.mockReturnValueOnce('id-one').mockReturnValueOnce('id-two');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state1 = notifications(undefined, addNotification({ message: 'First', type: 'success' }));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state2 = notifications(state1, addNotification({ message: 'Second', type: 'error' }));

    expect(state2.notifications).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state3 = notifications(state2, dismissNotification('id-one'));
    expect(state3.notifications).toHaveLength(1);
    expect(state3.notifications[0].id).toBe('id-two');
    expect(state3.notifications[0].message).toBe('Second');
  });

  it('should not modify state when dismissing a non-existent id', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state1 = notifications(
      undefined,
      addNotification({ message: 'Keep me', type: 'warning' }),
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state2 = notifications(state1, dismissNotification('does-not-exist'));
    expect(state2.notifications).toHaveLength(1);
  });

  it('should clear all notifications on NOTIFICATIONS_CLEAR', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state1 = notifications(undefined, addNotification({ message: 'First', type: 'success' }));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state2 = notifications(state1, addNotification({ message: 'Second', type: 'error' }));
    expect(state2.notifications).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state3 = notifications(state2, clearNotifications());
    expect(state3.notifications).toHaveLength(0);
  });

  it('should handle NOTIFICATIONS_CLEAR on already empty state', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore action creator type mismatch with reducer
    const state = notifications(undefined, clearNotifications());
    expect(state.notifications).toHaveLength(0);
  });
});

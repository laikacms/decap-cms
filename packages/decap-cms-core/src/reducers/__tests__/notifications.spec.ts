import {
  addNotification,
  clearNotifications,
  dismissNotification,
} from '../../actions/notifications';
import notifications from '../notifications';

import type { NotificationsState } from '../notifications';
import type { NotificationsAction } from '../../actions/notifications';

const mockedUuid = jest.spyOn(crypto, 'randomUUID') as unknown as jest.Mock<string, []>;

const defaultState: NotificationsState = {
  notifications: [],
};

describe('notifications', () => {
  beforeEach(() => {
    mockedUuid.mockReturnValue('mock-uuid');
  });

  it('should return empty notifications array as default state', () => {
    expect(notifications(undefined, {} as unknown as NotificationsAction)).toEqual(defaultState);
  });

  it('should append a notification on NOTIFICATION_SEND', () => {
    const state = notifications(
      undefined,
      addNotification({
        message: 'Hello world',
        type: 'success',
      }) as unknown as NotificationsAction,
    );
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({
      id: 'mock-uuid',
      message: 'Hello world',
      type: 'success',
    });
  });

  it('should append a notification with dismissAfter on NOTIFICATION_SEND', () => {
    const state = notifications(
      undefined,
      addNotification({
        message: 'Auto dismiss',
        type: 'info',
        dismissAfter: 3000,
      }) as unknown as NotificationsAction,
    );
    expect(state.notifications[0]).toMatchObject({
      id: 'mock-uuid',
      message: 'Auto dismiss',
      type: 'info',
      dismissAfter: 3000,
    });
  });

  it('should not append a duplicate notification with the same message and type on NOTIFICATION_SEND', () => {
    mockedUuid.mockReturnValueOnce('id-one').mockReturnValueOnce('id-two');

    const state1 = notifications(
      undefined,
      addNotification({
        message: 'Oops, you missed a required field',
        type: 'error',
      }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({
        message: 'Oops, you missed a required field',
        type: 'error',
      }) as unknown as NotificationsAction,
    );
    const state3 = notifications(
      state2,
      addNotification({
        message: 'Oops, you missed a required field',
        type: 'error',
      }) as unknown as NotificationsAction,
    );

    expect(state3.notifications).toHaveLength(1);
    expect(state3.notifications[0].id).toBe('id-one');
  });

  it('should still append a notification when message differs from an existing one of the same type', () => {
    const state1 = notifications(
      undefined,
      addNotification({ message: 'First error', type: 'error' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({ message: 'Second error', type: 'error' }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(2);
  });

  it('should still append a notification when type differs from an existing one with the same message', () => {
    const state1 = notifications(
      undefined,
      addNotification({ message: 'Same message', type: 'error' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({
        message: 'Same message',
        type: 'success',
      }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(2);
  });

  it('should dedup notifications with an object message using the message key', () => {
    const state1 = notifications(
      undefined,
      addNotification({
        message: { key: 'ui.toast.missingRequiredField', details: 'first attempt' },
        type: 'error',
      }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({
        message: { key: 'ui.toast.missingRequiredField', details: 'second attempt' },
        type: 'error',
      }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(1);
  });

  it('should append a new notification once a duplicate has been dismissed', () => {
    mockedUuid.mockReturnValueOnce('id-one').mockReturnValueOnce('id-two');

    const state1 = notifications(
      undefined,
      addNotification({ message: 'Repeatable', type: 'error' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      dismissNotification('id-one') as unknown as NotificationsAction,
    );
    const state3 = notifications(
      state2,
      addNotification({ message: 'Repeatable', type: 'error' }) as unknown as NotificationsAction,
    );

    expect(state3.notifications).toHaveLength(1);
    expect(state3.notifications[0].id).toBe('id-two');
  });

  it('should remove only the matching notification on NOTIFICATION_DISMISS', () => {
    mockedUuid.mockReturnValueOnce('id-one').mockReturnValueOnce('id-two');

    const state1 = notifications(
      undefined,
      addNotification({ message: 'First', type: 'success' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({ message: 'Second', type: 'error' }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(2);

    const state3 = notifications(
      state2,
      dismissNotification('id-one') as unknown as NotificationsAction,
    );
    expect(state3.notifications).toHaveLength(1);
    expect(state3.notifications[0].id).toBe('id-two');
    expect(state3.notifications[0].message).toBe('Second');
  });

  it('should not modify state when dismissing a non-existent id', () => {
    const state1 = notifications(
      undefined,
      addNotification({ message: 'Keep me', type: 'warning' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      dismissNotification('does-not-exist') as unknown as NotificationsAction,
    );
    expect(state2.notifications).toHaveLength(1);
  });

  it('should clear all notifications on NOTIFICATIONS_CLEAR', () => {
    const state1 = notifications(
      undefined,
      addNotification({ message: 'First', type: 'success' }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({ message: 'Second', type: 'error' }) as unknown as NotificationsAction,
    );
    expect(state2.notifications).toHaveLength(2);

    const state3 = notifications(state2, clearNotifications() as unknown as NotificationsAction);
    expect(state3.notifications).toHaveLength(0);
  });

  it('should handle NOTIFICATIONS_CLEAR on already empty state', () => {
    const state = notifications(undefined, clearNotifications() as unknown as NotificationsAction);
    expect(state.notifications).toHaveLength(0);
  });
});

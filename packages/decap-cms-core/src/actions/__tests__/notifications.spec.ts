import {
  addNotification,
  dismissNotification,
  clearNotifications,
  NOTIFICATION_SEND,
  NOTIFICATION_DISMISS,
  NOTIFICATIONS_CLEAR,
} from '../notifications';

describe('notifications action creators', () => {
  it('addNotification() returns NOTIFICATION_SEND action with payload', () => {
    const notification = { message: 'Something happened', type: 'info' as const };
    expect(addNotification(notification)).toEqual({
      type: NOTIFICATION_SEND,
      payload: notification,
    });
  });

  it('addNotification() accepts message object with key', () => {
    const notification = {
      message: { key: 'ui.toast.onBackendDown', details: 'https://status.example.com' },
      type: 'error' as const,
      dismissAfter: 5000,
    };
    const action = addNotification(notification);
    expect(action.type).toBe(NOTIFICATION_SEND);
    expect(action.payload).toBe(notification);
  });

  it('dismissNotification(id) returns NOTIFICATION_DISMISS action with id', () => {
    expect(dismissNotification('notif-42')).toEqual({
      type: NOTIFICATION_DISMISS,
      id: 'notif-42',
    });
  });

  it('clearNotifications() returns NOTIFICATIONS_CLEAR action', () => {
    expect(clearNotifications()).toEqual({ type: NOTIFICATIONS_CLEAR });
  });
});

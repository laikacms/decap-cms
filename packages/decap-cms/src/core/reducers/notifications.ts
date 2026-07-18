import { produce } from 'immer';

import { NOTIFICATION_DISMISS, NOTIFICATION_SEND, NOTIFICATIONS_CLEAR } from '@/core/actions/notifications';
import { randomUUID } from '@/lib/util/index';

import type { NotificationMessage, NotificationPayload, NotificationsAction } from '@/core/actions/notifications';

export type Notification = {
  id: string,
  message: string | NotificationMessage,
  dismissAfter?: number,
  type: 'info' | 'success' | 'warning' | 'error' | 'default' | undefined,
};

export type NotificationsState = {
  notifications: Notification[],
};

const defaultState: NotificationsState = {
  notifications: [],
};

function messagesMatch(a: string | NotificationMessage, b: string | NotificationMessage): boolean {
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b;
  }
  return a.key === b.key;
}

function isDuplicate(notification: Notification, payload: NotificationPayload): boolean {
  return notification.type === payload.type && messagesMatch(notification.message, payload.message);
}

const notifications = produce((state: NotificationsState, action: NotificationsAction) => {
  switch (action.type) {
    case NOTIFICATIONS_CLEAR:
      state.notifications = [];
      break;
    case NOTIFICATION_DISMISS:
      state.notifications = state.notifications.filter(n => n.id !== action.id);
      break;
    case NOTIFICATION_SEND: {
      const payload = action.payload as NotificationPayload;
      const alreadyShown = state.notifications.some(n => isDuplicate(n, payload));
      if (alreadyShown) {
        break;
      }
      state.notifications = [
        ...state.notifications,
        {
          id: randomUUID(),
          ...payload,
        },
      ];
      break;
    }
  }
}, defaultState);

export default notifications;

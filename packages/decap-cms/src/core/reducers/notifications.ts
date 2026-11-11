import { produce } from 'immer';

import {
  NOTIFICATION_DISMISS,
  NOTIFICATION_SEND,
  NOTIFICATION_UPDATE,
  NOTIFICATIONS_CLEAR,
} from '@/core/actions/notifications';
import { randomUUID } from '@/lib/util/index';

import type {
  NotificationLink,
  NotificationMessage,
  NotificationPayload,
  NotificationsAction,
} from '@/core/actions/notifications';

export type Notification = {
  id: string,
  message: string | NotificationMessage,
  dismissAfter?: number | false | undefined,
  type: 'info' | 'success' | 'warning' | 'error' | 'default' | undefined,
  link?: NotificationLink | undefined,
  spinner?: boolean | undefined,
};

export type NotificationsState = {
  notifications: Notification[],
};

const defaultState: NotificationsState = {
  notifications: [],
};

/**
 * Same key and same interpolated values. `details` is left out: it can hold an
 * Error (cyclic, not comparable by value), and two failures of the same kind
 * are one toast's worth of news either way.
 */
function messagesMatch(a: string | NotificationMessage, b: string | NotificationMessage): boolean {
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b;
  }
  if (a.key !== b.key) {
    return false;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete('details');
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    const comparable = (value: unknown) => value === undefined || value === null || typeof value !== 'object';
    if (comparable(left) && comparable(right) && left !== right) {
      return false;
    }
  }
  return true;
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
      const alreadyShown = state.notifications.some(n => n.id === payload.id || isDuplicate(n, payload));
      if (alreadyShown) {
        break;
      }
      state.notifications = [
        ...state.notifications,
        {
          ...payload,
          // The caller may name the id when it intends to update this
          // notification later; otherwise one is minted here.
          id: payload.id ?? randomUUID(),
        },
      ];
      break;
    }
    case NOTIFICATION_UPDATE: {
      // A new object for the changed notification only: the surface compares
      // by identity to decide which toasts to re-render.
      const payload = action.payload as Partial<NotificationPayload>;
      const index = state.notifications.findIndex(n => n.id === action.id);
      if (index !== -1) {
        state.notifications[index] = { ...state.notifications[index], ...payload, id: action.id as string };
      }
      break;
    }
  }
}, defaultState);

export default notifications;

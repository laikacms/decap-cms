/**
 * Notification severity. Mirrors react-toastify's former `TypeOptions`
 * union so reducers and consumers keep the exact same shape.
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'default';

export interface NotificationMessage {
  details?: unknown;
  key: string;
  // Selects the plural form for `||||`-delimited locale phrases (e.g.
  // `ui.toast.missingRequiredField`) and is interpolated as `%{smart_count}`
  // - see `src/core/i18n/polyglot.ts`.
  smart_count?: number;
  /** Further values are interpolations for the translator, e.g. `%{entry}`. */
  [interpolation: string]: unknown;
}

/** An action the notification offers, rendered as a link in the toast. */
export interface NotificationLink {
  url: string;
  label: string | NotificationMessage;
}

export interface NotificationPayload {
  message: string | NotificationMessage;
  /**
   * Milliseconds before the toast closes on its own. `false` keeps it up until
   * dismissed; omitting it uses the surface's default.
   */
  dismissAfter?: number | false | undefined;
  type: NotificationType | undefined;
  /** A link shown after the message, e.g. "View" on a "your change is live" toast. */
  link?: NotificationLink | undefined;
  /** Shows a spinner beside the message, for work still in progress. */
  spinner?: boolean | undefined;
  /** For a caller that will update this notification and needs its id up front. */
  id?: string | undefined;
}

export const NOTIFICATION_SEND = 'NOTIFICATION_SEND';
export const NOTIFICATION_UPDATE = 'NOTIFICATION_UPDATE';
export const NOTIFICATION_DISMISS = 'NOTIFICATION_DISMISS';
export const NOTIFICATIONS_CLEAR = 'NOTIFICATION_CLEAR';

function addNotification(notification: NotificationPayload) {
  return { type: NOTIFICATION_SEND, payload: notification };
}

/**
 * Changes a notification on screen in place instead of stacking a new one. A
 * no-op for an unknown id, e.g. a toast the user already dismissed.
 */
function updateNotification(id: string, notification: Partial<NotificationPayload>) {
  return { type: NOTIFICATION_UPDATE, id, payload: notification };
}

function dismissNotification(id: string) {
  return { type: NOTIFICATION_DISMISS, id };
}

function clearNotifications() {
  return { type: NOTIFICATIONS_CLEAR };
}

export type NotificationsAction = {
  type:
    | typeof NOTIFICATION_DISMISS
    | typeof NOTIFICATION_SEND
    | typeof NOTIFICATION_UPDATE
    | typeof NOTIFICATIONS_CLEAR,
  payload?: NotificationPayload | Partial<NotificationPayload>,
  id?: string,
};

export { addNotification, clearNotifications, dismissNotification, updateNotification };

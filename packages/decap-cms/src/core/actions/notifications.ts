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
}

export interface NotificationPayload {
  message: string | NotificationMessage;
  dismissAfter?: number;
  type: NotificationType | undefined;
}

export const NOTIFICATION_SEND = 'NOTIFICATION_SEND';
export const NOTIFICATION_DISMISS = 'NOTIFICATION_DISMISS';
export const NOTIFICATIONS_CLEAR = 'NOTIFICATION_CLEAR';

// Shared with `Notifications.tsx` / `LaikaNotifications.tsx`, whose
// `ROUTE_SCOPED_MESSAGE_KEYS` supersets this list with
// `ui.toast.onFailToLoadEntries` for LOCATION_CHANGE-triggered dismissal
// (DCMS-712 / DCMS-2309). This subset is what a successful persist
// (ENTRY_PERSIST_SUCCESS / UNPUBLISHED_ENTRY_PERSIST_SUCCESS) should clear -
// stale validation-error toasts from a prior failed save on the same route.
export const VALIDATION_ERROR_MESSAGE_KEYS = ['ui.toast.missingRequiredField', 'ui.toast.invalidField'];

function addNotification(notification: NotificationPayload) {
  return { type: NOTIFICATION_SEND, payload: notification };
}

function dismissNotification(id: string) {
  return { type: NOTIFICATION_DISMISS, id };
}

function clearNotifications() {
  return { type: NOTIFICATIONS_CLEAR };
}

// Dismisses any currently active notifications whose `message.key` matches
// one of `keys` (e.g. `VALIDATION_ERROR_MESSAGE_KEYS`), by looking them up
// in state and dispatching `dismissNotification` for each match. Used to
// clear stale validation-error toasts on a successful persist that happens
// on the same route (no LOCATION_CHANGE to trigger the existing
// route-scoped dismissal in Notifications.tsx / LaikaNotifications.tsx).
function dismissNotificationsByMessageKey(keys: string[]) {
  return (dispatch: (action: { type: string, id: string }) => void, getState: () => any) => {
    const state = getState();
    const notifications = state?.notifications?.notifications as
      | { id: string, message: string | NotificationMessage }[]
      | undefined;
    (notifications ?? [])
      .filter(notification => typeof notification.message !== 'string' && keys.includes(notification.message.key))
      .forEach(notification => dispatch(dismissNotification(notification.id)));
  };
}

export type NotificationsAction = {
  type: typeof NOTIFICATION_DISMISS | typeof NOTIFICATION_SEND | typeof NOTIFICATIONS_CLEAR,
  payload?: NotificationPayload,
  id?: string,
};

export { addNotification, clearNotifications, dismissNotification, dismissNotificationsByMessageKey };

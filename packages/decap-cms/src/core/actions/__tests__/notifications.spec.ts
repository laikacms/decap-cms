import { describe, expect, it, vi } from 'vitest';

import {
  NOTIFICATION_DISMISS,
  NOTIFICATION_SEND,
  NOTIFICATIONS_CLEAR,
  VALIDATION_ERROR_MESSAGE_KEYS,
  addNotification,
  clearNotifications,
  dismissNotification,
  dismissNotificationsByMessageKey,
} from '@/core/actions/notifications';

describe('notifications action creators', () => {
  it('addNotification returns NOTIFICATION_SEND with the payload', () => {
    const payload = { message: { key: 'ui.toast.invalidField' }, type: 'error' as const, dismissAfter: 500 };
    expect(addNotification(payload)).toEqual({ type: NOTIFICATION_SEND, payload });
  });

  it('dismissNotification returns NOTIFICATION_DISMISS with the id', () => {
    expect(dismissNotification('abc')).toEqual({ type: NOTIFICATION_DISMISS, id: 'abc' });
  });

  it('clearNotifications returns NOTIFICATIONS_CLEAR', () => {
    expect(clearNotifications()).toEqual({ type: NOTIFICATIONS_CLEAR });
  });
});

describe('VALIDATION_ERROR_MESSAGE_KEYS', () => {
  it('lists the validation error toast keys', () => {
    expect(VALIDATION_ERROR_MESSAGE_KEYS).toEqual(['ui.toast.missingRequiredField', 'ui.toast.invalidField']);
  });
});

describe('dismissNotificationsByMessageKey', () => {
  function run(state: unknown, keys: string[]) {
    const dispatch = vi.fn();
    dismissNotificationsByMessageKey(keys)(dispatch, () => state);
    return dispatch;
  }

  it('dispatches one dismiss per matching notification', () => {
    const dispatch = run(
      {
        notifications: {
          notifications: [
            { id: '1', message: { key: 'ui.toast.missingRequiredField' } },
            { id: '2', message: { key: 'ui.toast.other' } },
            { id: '3', message: { key: 'ui.toast.invalidField' } },
            { id: '4', message: { key: 'ui.toast.invalidField' } },
          ],
        },
      },
      VALIDATION_ERROR_MESSAGE_KEYS,
    );
    expect(dispatch.mock.calls.map(c => c[0])).toEqual([
      { type: NOTIFICATION_DISMISS, id: '1' },
      { type: NOTIFICATION_DISMISS, id: '3' },
      { type: NOTIFICATION_DISMISS, id: '4' },
    ]);
  });

  it('dispatches nothing when no keys match', () => {
    const dispatch = run(
      { notifications: { notifications: [{ id: '1', message: { key: 'ui.toast.other' } }] } },
      ['ui.toast.invalidField'],
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches nothing for an empty keys list', () => {
    const dispatch = run(
      { notifications: { notifications: [{ id: '1', message: { key: 'ui.toast.invalidField' } }] } },
      [],
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('skips plain-string messages without throwing', () => {
    const dispatch = run(
      {
        notifications: {
          notifications: [
            { id: '1', message: 'ui.toast.invalidField' },
            { id: '2', message: { key: 'ui.toast.invalidField' } },
          ],
        },
      },
      ['ui.toast.invalidField'],
    );
    expect(dispatch.mock.calls.map(c => c[0])).toEqual([{ type: NOTIFICATION_DISMISS, id: '2' }]);
  });

  it.each([
    ['state.notifications missing', {}],
    ['state.notifications.notifications missing', { notifications: {} }],
    ['state undefined', undefined],
  ])('does not dispatch or throw when %s', (_label, state) => {
    expect(() => run(state, ['ui.toast.invalidField'])).not.toThrow();
    expect(run(state, ['ui.toast.invalidField'])).not.toHaveBeenCalled();
  });
});

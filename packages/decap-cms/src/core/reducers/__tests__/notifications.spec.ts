import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addNotification,
  clearNotifications,
  dismissNotification,
  updateNotification,
} from '@/core/actions/notifications';
import notifications from '@/core/reducers/notifications';

import type { NotificationsAction } from '@/core/actions/notifications';
import type { NotificationsState } from '@/core/reducers/notifications';

function asUuid(value: string): ReturnType<typeof crypto.randomUUID> {
  return value as unknown as ReturnType<typeof crypto.randomUUID>;
}

const mockedUuid = vi.spyOn(crypto, 'randomUUID');

const defaultState: NotificationsState = {
  notifications: [],
};

describe('notifications', () => {
  beforeEach(() => {
    mockedUuid.mockReturnValue(asUuid('mock-uuid'));
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
    mockedUuid.mockReturnValueOnce(asUuid('id-one')).mockReturnValueOnce(asUuid('id-two'));

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
    mockedUuid.mockReturnValueOnce(asUuid('id-one')).mockReturnValueOnce(asUuid('id-two'));

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
    mockedUuid.mockReturnValueOnce(asUuid('id-one')).mockReturnValueOnce(asUuid('id-two'));

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

  // A caller that intends to update a notification has to know its id before
  // the reducer would mint one.
  it('keeps an id the caller supplied', () => {
    const state = notifications(
      undefined,
      addNotification({ id: 'save-1', message: 'Publishing', type: 'info' }) as unknown as NotificationsAction,
    );

    expect(state.notifications[0].id).toBe('save-1');
  });

  it('mints an id when the caller passes an undefined one', () => {
    const state = notifications(
      undefined,
      addNotification({ id: undefined, message: 'Saved', type: 'success' }) as unknown as NotificationsAction,
    );

    expect(state.notifications[0].id).toBe('mock-uuid');
  });

  it('merges an update into the notification, leaving the rest alone', () => {
    const before: NotificationsState = {
      notifications: [
        { id: 'a', message: 'Publishing', type: 'info', dismissAfter: false, spinner: true },
        { id: 'b', message: 'Something else', type: 'error' },
      ],
    };

    const after = notifications(
      before,
      updateNotification('a', {
        message: 'Live',
        type: 'success',
        dismissAfter: 8000,
        spinner: false,
        link: { url: 'https://site.example', label: 'View' },
      }) as unknown as NotificationsAction,
    );

    expect(after.notifications[0]).toEqual({
      id: 'a',
      message: 'Live',
      type: 'success',
      dismissAfter: 8000,
      spinner: false,
      link: { url: 'https://site.example', label: 'View' },
    });
    // Identity is how the toast surface spots the change: untouched ones keep theirs.
    expect(after.notifications[0]).not.toBe(before.notifications[0]);
    expect(after.notifications[1]).toBe(before.notifications[1]);
  });

  // The ordinary outcome of the user dismissing a toast mid-job.
  it('ignores an update for an id it no longer holds', () => {
    const before: NotificationsState = { notifications: [{ id: 'a', message: 'Publishing', type: 'info' }] };

    const after = notifications(
      before,
      updateNotification('gone', { message: 'Live' }) as unknown as NotificationsAction,
    );

    expect(after.notifications).toEqual(before.notifications);
  });

  // Two different entries going live are two pieces of news, not a duplicate.
  it('keeps messages with the same key but different interpolations', () => {
    const state1 = notifications(
      undefined,
      addNotification({
        message: { key: 'ui.toast.entryLive', entry: 'A' },
        type: 'success',
      }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({
        message: { key: 'ui.toast.entryLive', entry: 'B' },
        type: 'success',
      }) as unknown as NotificationsAction,
    );
    const state3 = notifications(
      state2,
      addNotification({
        message: { key: 'ui.toast.entryLive', entry: 'B' },
        type: 'success',
      }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(2);
    expect(state3.notifications).toHaveLength(2);
  });

  it('still treats differing details as the same message', () => {
    const state1 = notifications(
      undefined,
      addNotification({
        message: { key: 'ui.toast.onFailToPersist', details: new Error('a') },
        type: 'error',
      }) as unknown as NotificationsAction,
    );
    const state2 = notifications(
      state1,
      addNotification({
        message: { key: 'ui.toast.onFailToPersist', details: 'b' },
        type: 'error',
      }) as unknown as NotificationsAction,
    );

    expect(state2.notifications).toHaveLength(1);
  });
});

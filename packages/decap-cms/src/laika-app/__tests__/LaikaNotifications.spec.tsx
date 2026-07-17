import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LaikaNotifications from '@/laika-app/LaikaNotifications';

const dispatchMock = vi.fn();
let notificationsState: unknown[] = [];

vi.mock('@/core/hooks/useRedux', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ notifications: { notifications: notificationsState } }),
}));

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => `translated:${key}`,
}));

vi.mock('../LaikaThemeContext', () => ({
  useLaikaTheme: () => ({ resolvedMode: 'light' }),
}));

describe('LaikaNotifications (Base UI bridge)', () => {
  beforeEach(() => {
    notificationsState = [];
    dispatchMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a toast for a new notification with translated message', () => {
    notificationsState = [{ id: 'n1', message: { key: 'ui.toast.hello' }, type: 'success' }];
    render(<LaikaNotifications />);
    expect(screen.getByText('translated:ui.toast.hello')).toBeInTheDocument();
    expect(document.querySelector('.laika-notif__toast')).not.toBeNull();
    expect(document.querySelector('.laika-notif__container')).not.toBeNull();
  });

  it('renders plain string messages as-is', () => {
    notificationsState = [{ id: 'n1', message: 'plain message', type: 'info' }];
    render(<LaikaNotifications />);
    expect(screen.getByText('plain message')).toBeInTheDocument();
  });

  it('dispatches dismissNotification when the user closes the toast', () => {
    notificationsState = [{ id: 'n1', message: 'bye', type: 'error' }];
    render(<LaikaNotifications />);
    fireEvent.click(screen.getByLabelText('Close notification'));
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'NOTIFICATION_DISMISS', id: 'n1' });
  });

  it('dispatches dismissNotification when the toast times out (dismissAfter)', () => {
    vi.useFakeTimers();
    notificationsState = [{ id: 'n1', message: 'timed', type: 'info', dismissAfter: 1000 }];
    render(<LaikaNotifications />);
    expect(dispatchMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'NOTIFICATION_DISMISS', id: 'n1' });
  });

  it('uses the 4500ms default auto-close when dismissAfter is absent', () => {
    vi.useFakeTimers();
    notificationsState = [{ id: 'n1', message: 'default timing', type: 'info' }];
    render(<LaikaNotifications />);
    act(() => {
      vi.advanceTimersByTime(4400);
    });
    expect(dispatchMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'NOTIFICATION_DISMISS', id: 'n1' });
  });

  it('closes the toast without re-dispatching when the notification leaves the store', () => {
    notificationsState = [{ id: 'n1', message: 'store-driven', type: 'warning' }];
    const { rerender } = render(<LaikaNotifications />);
    expect(screen.getByText('store-driven')).toBeInTheDocument();

    notificationsState = [];
    rerender(<LaikaNotifications />);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('announces errors assertively (once) and others politely', () => {
    notificationsState = [
      { id: 'e1', message: 'boom', type: 'error' },
      { id: 'i1', message: 'fyi', type: 'info' },
    ];
    render(<LaikaNotifications />);
    // DCMS-546/DCMS-659: non-error toasts expose role="status" (polite) on
    // the visible Toast.Root, matching the previous react-toastify behavior.
    const infoToast = screen.getAllByText('fyi').map(el => el.closest('[role="status"]')).find(Boolean);
    expect(infoToast).toBeTruthy();
    expect(infoToast).toHaveAttribute('aria-hidden', 'false');

    // DCMS-809: error (high-priority) toasts must NOT get a role="alert"
    // override on the visible Toast.Root — Base UI's ToastViewport already
    // mounts a single hidden role="alert" announcer for high-priority
    // toasts, and duplicating the role produced two live regions with
    // identical text (double announcement to screen readers).
    const alertRegions = screen.getAllByText('boom').map(el => el.closest('[role="alert"]')).filter(Boolean);
    expect(alertRegions).toHaveLength(1);

    const visibleErrorToast = screen.getAllByText('boom').map(el => el.closest('.laika-notif__toast')).find(
      Boolean,
    );
    expect(visibleErrorToast).toBeTruthy();
    // Visible node stays exposed to AT (not hidden), but must not itself
    // carry role="alert" — that would re-introduce the duplicate.
    expect(visibleErrorToast).toHaveAttribute('aria-hidden', 'false');
    expect(visibleErrorToast).not.toHaveAttribute('role', 'alert');
  });
});

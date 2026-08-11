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

  it('keeps the Close button internally consistent (no hidden-focusable trap) for a high-priority error toast (DCMS-2007)', () => {
    notificationsState = [
      { id: 'validation-toast', message: 'Please complete before saving.', type: 'error' },
    ];
    render(<LaikaNotifications />);

    const closeButton = screen.getByLabelText('Close notification');
    const ariaHidden = closeButton.getAttribute('aria-hidden');
    const tabIndex = closeButton.getAttribute('tabindex');
    const pointerEvents = window.getComputedStyle(closeButton).pointerEvents;

    if (ariaHidden === 'true') {
      // Fully out of the a11y tree: not tab-reachable and not
      // pointer-hittable either, so it can't intercept clicks meant for
      // overlapping controls during the auto-dismiss window.
      expect(tabIndex).toBe('-1');
      expect(pointerEvents).toBe('none');
    } else {
      // Fully in the a11y tree: a real, reachable, clickable control.
      expect(ariaHidden).not.toBe('true');
      expect(tabIndex).toBe('0');
      expect(pointerEvents).not.toBe('none');
    }

    // The toast must still be dismissable by clicking anywhere on it,
    // regardless of the Close button's own interactive state.
    const toastRoot = closeButton.closest('.laika-notif__toast') as HTMLElement;
    fireEvent.click(toastRoot);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'NOTIFICATION_DISMISS', id: 'validation-toast' });
  });

  it('makes the Close button fully interactive once hovered or focused', () => {
    notificationsState = [{ id: 'e1', message: 'boom', type: 'error' }];
    render(<LaikaNotifications />);

    const closeButton = screen.getByLabelText('Close notification');
    const toastRoot = closeButton.closest('.laika-notif__toast') as HTMLElement;

    fireEvent.mouseEnter(toastRoot);

    expect(closeButton).not.toHaveAttribute('aria-hidden', 'true');
    expect(closeButton).toHaveAttribute('tabindex', '0');
    expect(window.getComputedStyle(closeButton).pointerEvents).not.toBe('none');
  });
});

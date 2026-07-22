import React from 'react';
import { render } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

import { Notifications } from '../Notifications';

import type { Notification } from '../../../reducers/notifications';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  connect: () => (component: unknown) => component,
}));

jest.mock('react-toastify', () => {
  const mockToast: jest.Mock & { onChange?: jest.Mock; dismiss?: jest.Mock } = jest.fn(
    () => 'toast-id',
  );
  mockToast.onChange = jest.fn();
  mockToast.dismiss = jest.fn();
  return { toast: mockToast, ToastContainer: () => null };
});

jest.mock('react-toastify/dist/inject-style', () => ({
  injectStyle: jest.fn(),
}));

jest.mock('react-polyglot', () => ({
  useTranslate: () => (key: string) => key,
}));

let mockHistoryListeners: Array<() => void> = [];

jest.mock('../../../routing/history', () => ({
  history: {
    listen: jest.fn((listener: () => void) => {
      mockHistoryListeners.push(listener);
      return () => {
        mockHistoryListeners = mockHistoryListeners.filter(l => l !== listener);
      };
    }),
  },
}));

const mockOnChange = toast.onChange as jest.Mock;

function fireRouteChange() {
  mockHistoryListeners.forEach(listener => listener());
}

describe('Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryListeners = [];
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
  });

  it('registers exactly one toast.onChange listener regardless of re-renders', () => {
    const notifications: Notification[] = [];
    const { rerender } = render(<Notifications notifications={notifications} />);

    // Re-render several times with new notification arrays, as would happen
    // across a create -> save -> navigate session where multiple toasts are
    // queued and dismissed. Previously `toast.onChange` was called directly
    // in the render body, so each of these re-renders registered another
    // listener and none were ever released.
    for (let i = 0; i < 5; i++) {
      rerender(
        <Notifications
          notifications={[
            { id: `n-${i}`, message: `message ${i}`, type: 'success', dismissAfter: undefined },
          ]}
        />,
      );
    }

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes the previous listener before registering a new one on unmount', () => {
    const unsubscribe = jest.fn();
    mockOnChange.mockReturnValue(unsubscribe);

    const { unmount } = render(<Notifications notifications={[]} />);
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('dismisses the missing-required-field validation toast on route change (DCMS-579)', () => {
    const dispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);

    const notifications: Notification[] = [
      {
        id: 'validation-toast',
        message: { key: 'ui.toast.missingRequiredField' },
        type: 'error',
        dismissAfter: 8000,
      },
    ];
    render(<Notifications notifications={notifications} />);
    dispatch.mockClear();

    fireRouteChange();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NOTIFICATION_DISMISS', id: 'validation-toast' }),
    );
  });

  it('dismisses the onFailToLoadEntries toast on route change (DCMS-1408)', () => {
    const dispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);

    const notifications: Notification[] = [
      {
        id: 'load-entry-error',
        message: { key: 'ui.toast.onFailToLoadEntries', details: 'Entry not found: _posts/foo.md' },
        type: 'error',
        dismissAfter: 8000,
      },
    ];
    render(<Notifications notifications={notifications} />);
    dispatch.mockClear();

    fireRouteChange();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NOTIFICATION_DISMISS', id: 'load-entry-error' }),
    );
  });

  it('does not dismiss unrelated toasts on route change', () => {
    const dispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);

    const notifications: Notification[] = [
      { id: 'save-success', message: 'Entry saved', type: 'success', dismissAfter: undefined },
    ];
    render(<Notifications notifications={notifications} />);
    dispatch.mockClear();

    fireRouteChange();

    expect(dispatch).not.toHaveBeenCalled();
  });
});

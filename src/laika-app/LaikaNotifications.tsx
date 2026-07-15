import React, { useEffect, useRef } from 'react';
import 'react-toastify/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '../core/actions/notifications';
import { useAppDispatch, useAppSelector } from '../core/hooks/useRedux';
import { useLocation } from '../core/routing/context';
import { useLaikaTheme } from './LaikaThemeContext';

import type { Id, ToastItem } from 'react-toastify';

/**
 * Laika-flavored notifications surface. Mirrors core's `Notifications`
 * Redux ↔ toast bridge logic, but configures the `ToastContainer` to
 * follow laika's theme (auto-switching between `'light'` and `'dark'`)
 * and uses a softer auto-close cadence + rounded corners via the inline
 * CSS injection. Slotted into `AppContentProps.renderNotifications`.
 */

interface CmsNotification {
  id: string;
  message: string | { key: string; details?: string; [key: string]: unknown };
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number;
}

type IdMap = { [id: string]: Id };

function LaikaNotifications() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const { resolvedMode } = useLaikaTheme();
  const notifications = useAppSelector(
    state => state.notifications.notifications as CmsNotification[],
  );
  const { pathname } = useLocation();
  // Bookkeeping only, never rendered - a ref avoids re-render churn and
  // keeps this value out of the toast.onChange effect's dependency list.
  const idMapRef = useRef<IdMap>({});

  useEffect(() => {
    const idMap = idMapRef.current;

    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = toast(
          typeof notification.message === 'string'
            ? notification.message
            : t(notification.message.key, { ...notification.message }),
          {
            autoClose: notification.dismissAfter ?? 4500,
            type: notification.type,
          },
        );
        idMap[notification.id] = toastId;

        if (notification.dismissAfter) {
          setTimeout(() => {
            dispatch(dismissNotification(notification.id));
          }, notification.dismissAfter);
        }
      });

    Object.keys(idMap).forEach(id => {
      if (!notifications.find(notification => notification.id === id)) {
        toast.dismiss(idMap[id]);
        delete idMap[id];
      }
    });
  }, [notifications, t, dispatch]);

  // `toast.onChange` returns an unsubscribe function and must be registered
  // exactly once, not on every render (leaked-listener bug, same class as
  // decap-cms-core's #185).
  useEffect(() => {
    return toast.onChange((payload: ToastItem) => {
      if (payload.status === 'removed') {
        const idMap = idMapRef.current;
        const id = Object.entries(idMap).find(([, toastId]) => toastId === payload.id)?.[0];
        if (id) {
          delete idMap[id];
          dispatch(dismissNotification(id));
        }
      }
    });
  }, [dispatch]);

  // Validation/save toasts are scoped to the page that raised them. Route
  // navigation is a strong enough signal that they're stale, so drop
  // whatever is still showing rather than let it follow the user to an
  // unrelated route (DCMS-579).
  const isFirstPathnameRender = useRef(true);
  useEffect(() => {
    if (isFirstPathnameRender.current) {
      isFirstPathnameRender.current = false;
      return;
    }

    const idMap = idMapRef.current;
    Object.keys(idMap).forEach(id => {
      toast.dismiss(idMap[id]);
      delete idMap[id];
      dispatch(dismissNotification(id));
    });
  }, [pathname, dispatch]);

  return (
    <ToastContainer
      position="bottom-right"
      theme={resolvedMode === 'dark' ? 'dark' : 'colored'}
      className="laika-notif__container"
      toastClassName="laika-notif__toast"
      autoClose={4500}
      pauseOnFocusLoss
      hideProgressBar
      closeOnClick
      newestOnTop
    />
  );
}

export default LaikaNotifications;

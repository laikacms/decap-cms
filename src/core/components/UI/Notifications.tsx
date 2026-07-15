import React, { useEffect, useRef } from 'react';
import 'react-toastify/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '../../actions/notifications';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useLocation } from '../../routing/context';

import type { Id, ToastItem } from 'react-toastify';

interface CmsNotification {
  id: string;
  message: string | { key: string; details?: string; [key: string]: unknown };
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number;
}

type Notification = CmsNotification;

type IdMap = {
  [id: string]: Id;
};

export default function Notifications() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(
    (state: any) => state.notifications.notifications as Notification[],
  );
  const { pathname } = useLocation();
  // Bookkeeping only, never rendered - a ref avoids re-render churn and,
  // importantly, avoids this value being captured in the toast.onChange
  // effect's dependency list (see below).
  const idMapRef = useRef<IdMap>({});

  useEffect(() => {
    const idMap = idMapRef.current;

    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = toast(
          typeof notification.message == 'string'
            ? notification.message
            : t(notification.message.key, { ...notification.message }),
          {
            autoClose: notification.dismissAfter ?? 8000,
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
  // exactly once. Registering it directly in the render body (as this
  // component previously did) subscribes a new listener on every re-render
  // without ever releasing the previous one, so the listener count grows
  // unbounded across a session (same class of bug as decap-cms-core's #185).
  useEffect(() => {
    return toast.onChange((payload: ToastItem) => {
      if (payload.status == 'removed') {
        const idMap = idMapRef.current;
        const id = Object.entries(idMap).find(([, toastId]) => toastId === payload.id)?.[0];
        if (id) {
          delete idMap[id];
          dispatch(dismissNotification(id));
        }
      }
    });
  }, [dispatch]);

  // Validation/save toasts are scoped to the page that raised them (e.g. the
  // entry editor). Route navigation is a strong enough signal that they're
  // stale, so drop whatever is still showing rather than let it follow the
  // user to an unrelated route (DCMS-579).
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
    <>
      <ToastContainer position="top-right" theme="colored" className="notif__container" />
    </>
  );
}

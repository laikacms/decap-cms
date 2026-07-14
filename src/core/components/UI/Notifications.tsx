import React, { useEffect } from 'react';
import 'react-toastify/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';

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
  const [idMap, setIdMap] = React.useState<IdMap>({});

  useEffect(() => {
    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = toast(
          typeof notification.message == 'string'
            ? notification.message
            : t(notification.message.key, { ...notification.message }),
          {
            autoClose: notification.dismissAfter,
            type: notification.type,
          },
        );

        idMap[notification.id] = toastId;
        setIdMap(idMap);

        if (notification.dismissAfter) {
          setTimeout(() => {
            dispatch(dismissNotification(notification.id));
          }, notification.dismissAfter);
        }
      });

    Object.entries(idMap).forEach(([id, toastId]) => {
      if (!notifications.find(notification => notification.id === id)) {
        toast.dismiss(toastId);
        delete idMap[id];
        setIdMap(idMap);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idMap is mutated in place; a deeper refactor is owed
  }, [notifications]);

  toast.onChange((payload: ToastItem) => {
    if (payload.status == 'removed') {
      const id = Object.entries(idMap).find(([, toastId]) => toastId === payload.id)?.[0];
      if (id) {
        dispatch(dismissNotification(id));
      }
    }
  });

  return (
    <>
      <ToastContainer position="top-right" theme="colored" className="notif__container" />
    </>
  );
}

import React, { useEffect, useRef } from 'react';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { toastManager, Toaster } from '@/ui/toast';

interface CmsNotification {
  id: string;
  message: string | { key: string; details?: string; [key: string]: unknown };
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number;
}

type Notification = CmsNotification;

export default function Notifications() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(
    (state: any) => state.notifications.notifications as Notification[],
  );
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    const currentIds = new Set(notifications.map(notification => notification.id));

    notifications
      .filter(notification => !shownIds.current.has(notification.id))
      .forEach(notification => {
        shownIds.current.add(notification.id);
        toastManager.add({
          id: notification.id,
          description:
            typeof notification.message == 'string'
              ? notification.message
              : t(notification.message.key, { ...notification.message }),
          type: notification.type,
          timeout: notification.dismissAfter,
          onRemove: () => dispatch(dismissNotification(notification.id)),
        });
      });

    shownIds.current.forEach(id => {
      if (!currentIds.has(id)) {
        shownIds.current.delete(id);
        toastManager.close(id);
      }
    });
  }, [notifications, dispatch, t]);

  return <Toaster className="notif__container" />;
}

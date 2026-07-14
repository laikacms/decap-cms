import React, { useEffect } from 'react';
import 'react-toastify/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
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
  const [idMap, setIdMap] = React.useState<IdMap>({});

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors core's pattern; idMap is mutated in place
  }, [notifications]);

  toast.onChange((payload: ToastItem) => {
    if (payload.status === 'removed') {
      const id = Object.entries(idMap).find(([, toastId]) => toastId === payload.id)?.[0];
      if (id) {
        dispatch(dismissNotification(id));
      }
    }
  });

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

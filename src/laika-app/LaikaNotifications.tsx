import React, { useEffect, useRef } from 'react';
import { useTranslate } from 'react-polyglot';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { toastManager, Toaster } from '@/ui/toast';

/**
 * Laika-flavored notifications surface. Mirrors core's `Notifications`
 * Redux ↔ toast bridge logic, but positions the `Toaster` bottom-right with
 * a softer auto-close cadence. Theming follows the shared `--popover` /
 * `--foreground` CSS variable tokens, which already track laika's
 * light/dark mode, so no explicit theme prop is needed. Slotted into
 * `AppContentProps.renderNotifications`.
 */

interface CmsNotification {
  id: string;
  message: string | { key: string; details?: string; [key: string]: unknown };
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number;
}

const DEFAULT_DISMISS_AFTER = 4500;

function LaikaNotifications() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(
    state => state.notifications.notifications as CmsNotification[],
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
            typeof notification.message === 'string'
              ? notification.message
              : t(notification.message.key, { ...notification.message }),
          type: notification.type,
          timeout: notification.dismissAfter ?? DEFAULT_DISMISS_AFTER,
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

  return <Toaster position="bottom-right" className="laika-notif__container" />;
}

export default LaikaNotifications;

import { Toast } from '@base-ui/react/toast';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/i18n';
import { useRouter } from '@/core/routing/context';
import { toastManager } from '@/ui/toastManager';

/**
 * Classic app notifications surface. Bridges the Redux notifications slice
 * to Base UI's Toast primitives (formerly react-toastify's ToastContainer),
 * keeping the previous top-right placement, "colored" theme surfaces, and
 * auto-close cadence. Also mounts the shared ui-layer `toastManager`, so
 * toasts raised imperatively from ui code (e.g. the editor's
 * ShareContentPlugin) render in the same viewport.
 */

type CmsMessage = string | { key: string, details?: unknown, [key: string]: unknown };

interface CmsNotification {
  id: string;
  message: CmsMessage;
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number | false | undefined;
  link?: { url: string, label: CmsMessage } | undefined;
  spinner?: boolean | undefined;
}

/** Rendered beside the title: an action link and an in-progress spinner. */
interface ToastData {
  link?: { url: string, label: string } | undefined;
  spinner?: boolean | undefined;
}

/**
 * Per notification id: the Base UI toast showing it, and the notification as
 * last rendered. The reducer is immer, which keeps the object of every
 * notification it did not change, so identity is the change check; comparing
 * contents would mean serializing `details`, which can hold a cyclic error.
 */
type IdMap = { [id: string]: { toastId: string, notification: CmsNotification } };

/** Parity with react-toastify's default `autoClose` (the old container set none). */
const AUTO_DISMISS_MS = 5000;

/** react-toastify had no limit; keep effectively unlimited stacking. */
const TOAST_LIMIT = 50;

/** Per-type accent colors, matching react-toastify's "colored" palette. */
const ACCENTS: Record<string, string> = {
  success: '#07bc0c',
  error: '#e74c3c',
  info: '#3498db',
  warning: '#f1c40f',
};

const NEUTRAL_ACCENT = '#757575';

/** `false` holds the toast open (Base UI's `0`); omitted means the default. */
function timeoutFor(dismissAfter: CmsNotification['dismissAfter']): number {
  if (dismissAfter === false) return 0;
  return dismissAfter ?? AUTO_DISMISS_MS;
}

/**
 * Notification message keys scoped to whatever entry editor raised them
 * (a save-validation error, or a failed entry/entries load) rather than
 * being app-wide. Left alone, their `dismissAfter` window (commonly 8s) lets
 * them travel with the user to an unrelated route - a NotFoundPage, or a
 * different collection's entry - still showing the stale path/details from
 * the route that raised them. Dismissed as soon as the user navigates away
 * instead (DCMS-579, DCMS-1408).
 */
const ROUTE_SCOPED_MESSAGE_KEYS = [
  'ui.toast.missingRequiredField',
  'ui.toast.invalidField',
  'ui.toast.onFailToLoadEntries',
];

function isRouteScopedNotification(notification: CmsNotification): boolean {
  return (
    typeof notification.message !== 'string'
    && ROUTE_SCOPED_MESSAGE_KEYS.includes(notification.message.key)
  );
}

const viewportStyles = css`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 320px;
  max-width: calc(100vw - 32px);
  margin: 0;
  padding: 0;
  outline: none;
`;

function toastStyles(type: string | undefined) {
  const accent = (type && ACCENTS[type]) || NEUTRAL_ACCENT;
  return css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 64px;
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow:
      0 1px 10px 0 rgba(0, 0, 0, 0.1),
      0 2px 15px 0 rgba(0, 0, 0, 0.05);
    font-size: 14px;
    line-height: 1.4;
    cursor: pointer;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    background: ${accent};
    color: #fff;

    &[data-starting-style],
    &[data-ending-style] {
      opacity: 0;
      transform: translateX(110%);
    }

    &[data-limited] {
      display: none;
    }
  `;
}

const titleStyles = css`
  flex: 1;
  margin: 0;
  font-size: inherit;
  font-weight: 500;
  word-break: break-word;
`;

const linkStyles = css`
  color: inherit;
  text-decoration: underline;
  font-weight: 700;
  white-space: nowrap;
`;

const spinnerStyles = css`
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: notif-spin 0.8s linear infinite;

  @keyframes notif-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const closeStyles = css`
  flex-shrink: 0;
  align-self: flex-start;
  margin: 0;
  padding: 2px 4px;
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.7;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    opacity: 1;
  }
`;

interface NotificationToastProps {
  toastItem: ReturnType<typeof Toast.useToastManager>['toasts'][number];
  onDismiss: () => void;
}

/**
 * Base UI's `Toast.Close` internally sets `aria-hidden` to
 * `!expanded && !hasFocus`, where `expanded` comes from hovering/focusing
 * the whole toast viewport - a mechanism meant for a collapsed-stack UI
 * (hover to reveal each toast's own controls). This app doesn't render a
 * `Toast.Positioner`/collapsed stack, so every toast is always fully
 * visible, yet the Close button still gets `aria-hidden="true"` whenever
 * the toast isn't hovered/focused - while remaining a real, `tabindex="0"`,
 * `pointer-events: auto` `<button>`. That's a WCAG 4.1.2 "hidden focusable"
 * trap: focusable/clickable but invisible to assistive tech, and its click
 * capture can steal clicks meant for overlapping controls (e.g. the top-right
 * toolbar) during the auto-dismiss window (DCMS-2007).
 *
 * Fix: track hover/focus on the toast ourselves and force `aria-hidden`,
 * `tabIndex`, and `pointer-events` to agree, overriding Base UI's internal
 * (caller props win - see `mergeProps`). While inert, clicks over the Close
 * button's area fall through to `Toast.Root`'s own `onClick`, so the toast
 * stays dismissable by clicking anywhere on it.
 */
function NotificationToast({ toastItem, onDismiss }: NotificationToastProps) {
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const interactive = hovered || focused;
  const data = toastItem.data as ToastData | undefined;

  return (
    <Toast.Root
      toast={toastItem}
      className="notif__toast"
      css={toastStyles(toastItem.type)}
      onClick={onDismiss}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      // DCMS-809: high-priority (error) toasts are already announced by
      // Base UI's own hidden ToastViewport announcer (role="alert"),
      // which only mounts for priority: 'high'. Overriding role here
      // too would mount a second role="alert" region with identical
      // text, so only non-high-priority toasts get the role="status"
      // override (DCMS-659); high-priority ones fall back to Base UI's
      // default (role="alertdialog"), which isn't a live region and
      // won't duplicate the announcement.
      role={toastItem.priority === 'high' ? undefined : 'status'}
      aria-hidden={false}
    >
      {data?.spinner && <span className="notif__spinner" css={spinnerStyles} aria-hidden="true" />}
      <Toast.Title css={titleStyles}>
        {toastItem.title}
        {data?.link && (
          <>
            {' '}
            <a
              href={data.link.url}
              target="_blank"
              rel="noopener noreferrer"
              // Clicking it also closes the toast, like a click anywhere on
              // it; the link opens in its own tab either way.
              css={linkStyles}
            >
              {data.link.label}
            </a>
          </>
        )}
      </Toast.Title>
      <Toast.Close
        aria-label={'Close notification'}
        css={closeStyles}
        aria-hidden={interactive ? undefined : true}
        tabIndex={interactive ? 0 : -1}
        style={{ pointerEvents: interactive ? undefined : 'none' }}
      >
        {'×'}
      </Toast.Close>
    </Toast.Root>
  );
}

function NotificationsBridge() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const notifications = useAppSelector(
    state => state.notifications.notifications as CmsNotification[],
  );
  const { toasts, add, close, update } = Toast.useToastManager();
  const idMapRef = useRef<IdMap>({});
  // Mirrors `notifications` for the router-subscribe listener below, which
  // is registered once and must always see the latest list rather than the
  // one captured at registration time.
  const notificationsRef = useRef<CmsNotification[]>(notifications);
  notificationsRef.current = notifications;

  // Entry-editor-scoped notifications (validation errors, failed entry
  // loads) should not travel with the user to an unrelated route. Dismissing
  // on every navigation is cheap and correct here because dismissNotification
  // is a no-op once the id is already gone (DCMS-579, DCMS-1408).
  useEffect(() => {
    return router.subscribe(() => {
      notificationsRef.current.filter(isRouteScopedNotification).forEach(notification => {
        dispatch(dismissNotification(notification.id));
      });
    });
  }, [dispatch, router]);

  useEffect(() => {
    const idMap = idMapRef.current;

    function translateMessage(message: CmsMessage) {
      return typeof message === 'string' ? message : t(message.key, { ...message });
    }

    function contentOf(notification: CmsNotification) {
      const data: ToastData = {
        link: notification.link
          ? { url: notification.link.url, label: translateMessage(notification.link.label) }
          : undefined,
        spinner: notification.spinner,
      };
      return {
        title: translateMessage(notification.message),
        type: notification.type,
        timeout: timeoutFor(notification.dismissAfter),
        priority: notification.type === 'error' ? 'high' as const : 'low' as const,
        data,
      };
    }

    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = add({
          ...contentOf(notification),
          onClose: () => {
            // Fires when the user dismisses the toast or when it times out.
            // The guard keeps a store-driven close (below) from dispatching
            // a redundant removal back into Redux.
            if (idMapRef.current[notification.id]) {
              delete idMapRef.current[notification.id];
              dispatch(dismissNotification(notification.id));
            }
          },
        });
        idMap[notification.id] = { toastId, notification };
      });

    // A notification changed in place (`updateNotification`): one job
    // reporting its stages through a single toast rather than stacking one
    // per stage. Base UI re-arms the auto-dismiss timer when the timeout
    // changes, and clears it for `0`, so a timed toast updated to be held
    // open does not still close on its first schedule.
    notifications.forEach(notification => {
      const entry = idMap[notification.id];
      if (!entry || entry.notification === notification) {
        return;
      }
      entry.notification = notification;
      update(entry.toastId, contentOf(notification));
    });

    Object.entries(idMap).forEach(([id, { toastId }]) => {
      if (!notifications.some(notification => notification.id === id)) {
        delete idMap[id];
        close(toastId);
      }
    });
  }, [notifications, add, close, update, dispatch, t]);

  return (
    <Toast.Portal>
      <Toast.Viewport className="notif__container" css={viewportStyles}>
        {toasts.map(toastItem => (
          <NotificationToast
            key={toastItem.id}
            toastItem={toastItem}
            onDismiss={() => close(toastItem.id)}
          />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export default function Notifications() {
  return (
    <Toast.Provider timeout={AUTO_DISMISS_MS} limit={TOAST_LIMIT} toastManager={toastManager}>
      <NotificationsBridge />
    </Toast.Provider>
  );
}

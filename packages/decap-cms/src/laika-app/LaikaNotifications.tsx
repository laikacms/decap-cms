
import { Toast } from '@base-ui/react/toast';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';

import { dismissNotification } from '@/core/actions/notifications';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/i18n';
import { useLaikaTheme } from './LaikaThemeContext';

/**
 * Laika-flavored notifications surface. Mirrors core's `Notifications`
 * Redux <-> toast bridge logic, but renders through Base UI's Toast
 * primitives instead of react-toastify, styled with emotion to follow
 * laika's theme (auto-switching between light "colored" surfaces and a
 * dark surface with per-type accents) with the same bottom-right
 * placement, soft auto-close cadence, and rounded corners as before.
 * Slotted into `AppContentProps.renderNotifications`.
 */

interface CmsNotification {
  id: string;
  message: string | { key: string, details?: string, [key: string]: unknown };
  type: 'success' | 'error' | 'info' | 'warning';
  dismissAfter?: number;
}

type IdMap = { [id: string]: string };

/** Parity with the previous `ToastContainer` `autoClose={4500}`. */
const AUTO_DISMISS_MS = 4500;

/** react-toastify had no limit; keep effectively unlimited stacking. */
const TOAST_LIMIT = 50;

/** Per-type accent colors, matching react-toastify's palette. */
const ACCENTS: Record<string, string> = {
  success: '#07bc0c',
  error: '#e74c3c',
  info: '#3498db',
  warning: '#f1c40f',
};

const NEUTRAL_ACCENT = '#757575';

const viewportStyles = css`
  position: fixed;
  bottom: 16px;
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

function toastStyles(mode: 'light' | 'dark', type: string | undefined) {
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

    ${
    mode === 'dark'
      ? css`
          background: #121212;
          color: #fff;
          border-left: 4px solid ${accent};
        `
      : css`
          background: ${accent};
          color: #fff;
        `
  };

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

function LaikaToastBridge() {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const { resolvedMode } = useLaikaTheme();
  const notifications = useAppSelector(
    state => state.notifications.notifications as CmsNotification[],
  );
  const { toasts, add, close } = Toast.useToastManager();
  const idMapRef = useRef<IdMap>({});

  useEffect(() => {
    const idMap = idMapRef.current;

    notifications
      .filter(notification => !idMap[notification.id])
      .forEach(notification => {
        const toastId = add({
          title: typeof notification.message === 'string'
            ? notification.message
            : t(notification.message.key, { ...notification.message }),
          type: notification.type,
          timeout: notification.dismissAfter ?? AUTO_DISMISS_MS,
          priority: notification.type === 'error' ? 'high' : 'low',
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
        idMap[notification.id] = toastId;
      });

    Object.entries(idMap).forEach(([id, toastId]) => {
      if (!notifications.some(notification => notification.id === id)) {
        delete idMap[id];
        close(toastId);
      }
    });
  }, [notifications, add, close, dispatch, t]);

  return (
    <Toast.Portal>
      <Toast.Viewport className="laika-notif__container" css={viewportStyles}>
        {toasts.map(toastItem => (
          <Toast.Root
            key={toastItem.id}
            toast={toastItem}
            className="laika-notif__toast"
            css={toastStyles(resolvedMode, toastItem.type)}
            onClick={() => close(toastItem.id)}
            // Base UI's default is role="alertdialog" (high priority) or
            // role="dialog" (low priority) — neither matches the DCMS-546
            // a11y contract (role="status" for non-errors) that the previous
            // react-toastify implementation satisfied. Overriding here wins
            // because Toast.Root merges caller props after its internal
            // defaults.
            //
            // DCMS-809: high-priority (error) toasts are NOT given a
            // role="alert" override here — Base UI's ToastViewport already
            // mounts its own hidden role="alert" announcer for every
            // priority: 'high' toast. Overriding role on the visible node
            // too produced two role="alert" regions with identical text,
            // double-announcing errors to screen readers. Falling back to
            // Base UI's default (role="alertdialog") avoids the collision;
            // it isn't a live region, so it doesn't announce on its own.
            role={toastItem.priority === 'high' ? undefined : 'status'}
            // Base UI also hides high-priority (error) toasts from the
            // accessibility tree via aria-hidden until they receive focus,
            // since alertdialog semantics assume a focused modal. Live
            // regions (alert/status) must stay exposed to be announced.
            aria-hidden={false}
          >
            <Toast.Title css={titleStyles} />
            <Toast.Close aria-label={'Close notification'} css={closeStyles}>
              {'×'}
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function LaikaNotifications() {
  return (
    <Toast.Provider timeout={AUTO_DISMISS_MS} limit={TOAST_LIMIT}>
      <LaikaToastBridge />
    </Toast.Provider>
  );
}

export default LaikaNotifications;

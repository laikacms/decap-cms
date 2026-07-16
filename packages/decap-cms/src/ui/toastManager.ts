import { Toast } from '@base-ui/react/toast';

/**
 * Shared Base UI toast manager singleton for the classic app.
 *
 * The ui layer cannot import from core (see `local/layer-deps`), so ui-level
 * code that needs to raise a toast outside of React context (for example the
 * editor's `ShareContentPlugin`) calls this manager directly. The core
 * `Notifications` component hands the same instance to its `Toast.Provider`
 * (`toastManager` prop), so manager-originated toasts render in the same
 * viewport, with the same styling, as Redux-driven notifications.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export const toastManager = Toast.createToastManager();

/**
 * Convenience wrapper around `toastManager.add` that keeps type and
 * announcement priority consistent (errors announce assertively).
 */
export function addToast(title: string, type: ToastType): string {
  return toastManager.add({
    title,
    type,
    priority: type === 'error' ? 'high' : 'low',
  });
}

import { Toast } from '@base-ui/react/toast';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { css, cx } from './styled';

import type { ToastManager, ToastManagerAddOptions } from '@base-ui/react/toast';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'default';

export interface ToastOptions {
  type?: ToastVariant;
  /** Auto-dismiss delay in ms. `0` disables auto-dismiss. */
  timeout?: number;
  /** Called once the toast has fully left the viewport (after any exit animation). */
  onRemove?: () => void;
}

/**
 * Module-level toast manager, created once and shared by every `toast.*`
 * call and every `<Toaster />` mounted against it. Base UI's toast manager
 * is usable outside of React (unlike plain context), so it can be imported
 * and called directly as a global singleton, without a Provider ancestor.
 */
export const toastManager: ToastManager = Toast.createToastManager();

function add(description: React.ReactNode, options: ToastOptions = {}): string {
  return toastManager.add({
    description,
    type: options.type,
    timeout: options.timeout,
    onRemove: options.onRemove,
  } satisfies ToastManagerAddOptions<object>);
}

/** Imperative toast API. Usable from anywhere, no `<Toaster />` ancestor required. */
export const toast = Object.assign(
  (description: React.ReactNode, options?: ToastOptions) => add(description, options),
  {
    success: (description: React.ReactNode, options?: Omit<ToastOptions, 'type'>) =>
      add(description, { ...options, type: 'success' }),
    error: (description: React.ReactNode, options?: Omit<ToastOptions, 'type'>) =>
      add(description, { ...options, type: 'error' }),
    info: (description: React.ReactNode, options?: Omit<ToastOptions, 'type'>) =>
      add(description, { ...options, type: 'info' }),
    warning: (description: React.ReactNode, options?: Omit<ToastOptions, 'type'>) =>
      add(description, { ...options, type: 'warning' }),
    dismiss: (id?: string) => toastManager.close(id),
  },
);

export type ToasterPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

const viewportClass = css`
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 22rem;
  padding: 1rem;
  outline: none;
  pointer-events: none;
`;

const positionClass: Record<ToasterPosition, string> = {
  'top-right': css`
    top: 0;
    right: 0;
    align-items: flex-end;
  `,
  'top-left': css`
    top: 0;
    left: 0;
    align-items: flex-start;
  `,
  'top-center': css`
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    align-items: center;
  `,
  'bottom-right': css`
    bottom: 0;
    right: 0;
    flex-direction: column-reverse;
    align-items: flex-end;
  `,
  'bottom-left': css`
    bottom: 0;
    left: 0;
    flex-direction: column-reverse;
    align-items: flex-start;
  `,
  'bottom-center': css`
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: column-reverse;
    align-items: center;
  `,
};

const rootClass = css`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background-color: var(--popover);
  color: var(--popover-foreground);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--foreground), transparent 88%);

  &[data-type='success'] {
    border-color: color-mix(in srgb, var(--primary), transparent 50%);
  }
  &[data-type='error'] {
    border-color: color-mix(in srgb, var(--destructive), transparent 50%);
    color: var(--destructive);
  }
  &[data-type='warning'] {
    border-color: color-mix(in srgb, var(--destructive), transparent 70%);
  }

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  transition:
    opacity 150ms ease,
    transform 150ms ease;
`;

const contentClass = css`
  flex: 1 1 auto;
  min-width: 0;
`;

const titleClass = css`
  font-weight: 600;
  margin: 0 0 0.125rem;
`;

const descriptionClass = css`
  margin: 0;
  word-break: break-word;
`;

const closeClass = css`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;

  &:hover {
    opacity: 1;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

function roleForType(type: string | undefined): 'status' | 'alert' {
  return type === 'error' || type === 'warning' ? 'alert' : 'status';
}

export interface ToasterProps {
  position?: ToasterPosition;
  className?: string;
  /** Defaults to the shared module-level `toastManager`. */
  manager?: ToastManager;
}

function ToastList({ position, className }: { position: ToasterPosition; className?: string }) {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className={cx(viewportClass, positionClass[position], className)}>
        {toasts.map(item => (
          <Toast.Root
            key={item.id}
            toast={item}
            className={rootClass}
            data-type={item.type}
            role={roleForType(item.type)}
            aria-live={item.type === 'error' ? 'assertive' : 'polite'}
          >
            <Toast.Content className={contentClass}>
              {item.title ? <Toast.Title className={titleClass} /> : null}
              <Toast.Description className={descriptionClass} />
            </Toast.Content>
            <Toast.Close aria-label="Dismiss notification" className={closeClass}>
              <XIcon aria-hidden />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

/**
 * Toast host. Mount once per app tree (or once per surface that wants its
 * own position); pairs with the imperative `toast` API above, which works
 * without a `<Toaster />` ancestor because the manager is created outside
 * React.
 */
export function Toaster({
  position = 'top-right',
  className,
  manager = toastManager,
}: ToasterProps): React.ReactNode {
  return (
    <Toast.Provider toastManager={manager}>
      <ToastList position={position} className={className} />
    </Toast.Provider>
  );
}

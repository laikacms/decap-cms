/** @jsxImportSource @emotion/react */
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as React from 'react';

import { css, type WithClassName } from './styled';
import { buttonVariants } from './Button';

export function AlertDialog(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Root>,
): React.ReactNode {
  return <AlertDialogPrimitive.Root {...props} />;
}

export function AlertDialogTrigger(
  props: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Trigger>>,
): React.ReactNode {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

const backdropClass = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgb(0 0 0 / 0.1);
`;

const popupClass = css`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 50;
  display: grid;
  width: 100%;
  max-width: calc(100% - 2rem);
  transform: translate(-50%, -50%);
  gap: 1.5rem;
  border-radius: 0.75rem;
  background-color: var(--popover);
  padding: 1.5rem;
  font-size: 0.875rem;
  color: var(--popover-foreground);
  outline: 1px solid color-mix(in srgb, var(--foreground), transparent 90%);
  @media (min-width: 640px) {
    max-width: 28rem;
  }
`;

export function AlertDialogContent({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Popup>>): React.ReactNode {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-backdrop" css={backdropClass} />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        css={popupClass}
        className={className}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

const headerClass = css`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="alert-dialog-header" css={headerClass} className={className} {...props} />;
}

const footerClass = css`
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

export function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="alert-dialog-footer" css={footerClass} className={className} {...props} />;
}

const titleClass = css`
  margin: 0;
  font-size: 0.875rem;
  line-height: 1;
  font-weight: 500;
`;

export function AlertDialogTitle({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Title>>): React.ReactNode {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      css={titleClass}
      className={className}
      {...props}
    />
  );
}

const descriptionClass = css`
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-foreground);
`;

export function AlertDialogDescription({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Description>>): React.ReactNode {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      css={descriptionClass}
      className={className}
      {...props}
    />
  );
}

export function AlertDialogClose(
  props: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Close>>,
): React.ReactNode {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}

export interface AlertOptions {
  /** Dialog heading; defaults to "Alert". */
  title?: string;
  /** Label for the dismiss button; defaults to "OK". */
  okLabel?: string;
}

interface PendingAlert extends AlertOptions {
  id: number;
  message: string;
  resolve: () => void;
}

let pendingAlerts: PendingAlert[] = [];
let nextAlertId = 1;
const alertListeners = new Set<() => void>();

function subscribeToAlerts(listener: () => void) {
  alertListeners.add(listener);
  return () => {
    alertListeners.delete(listener);
  };
}

function getPendingAlerts() {
  return pendingAlerts;
}

function emitAlertsChanged() {
  for (const listener of alertListeners) listener();
}

/**
 * Imperative replacement for `window.alert`, usable from non-React code
 * (actions, backend APIs). Queues the message on the nearest mounted
 * `AlertDialogHost` and resolves once the user dismisses it. Falls back to
 * `window.alert` when no host is mounted so messages are never dropped.
 */
export function showAlert(message: string, options: AlertOptions = {}): Promise<void> {
  if (alertListeners.size === 0) {
    window.alert(message);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    pendingAlerts = [...pendingAlerts, { id: nextAlertId++, message, resolve, ...options }];
    emitAlertsChanged();
  });
}

/**
 * Renders the queue fed by `showAlert`, one dialog at a time. Mount exactly
 * once, near the app root (`DecapCmsProvider` does this for the CMS shells).
 */
export function AlertDialogHost(): React.ReactNode {
  const queue = React.useSyncExternalStore(subscribeToAlerts, getPendingAlerts, getPendingAlerts);
  const current = queue[0];

  if (!current) return null;

  const dismiss = () => {
    pendingAlerts = pendingAlerts.filter(pending => pending.id !== current.id);
    emitAlertsChanged();
    current.resolve();
  };

  return (
    <AlertDialog
      key={current.id}
      open
      onOpenChange={open => {
        if (!open) dismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current.title ?? 'Alert'}</AlertDialogTitle>
          <AlertDialogDescription>{current.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose css={buttonVariants({ variant: 'outline' })}>
            {current.okLabel ?? 'OK'}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

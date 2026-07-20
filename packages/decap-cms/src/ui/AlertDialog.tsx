
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as React from 'react';

import { Button, buttonVariants } from './Button';
import { Input } from './Input';
import { css, type WithClassName } from './styled';

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

/**
 * Captures the currently focused element so it can be restored once an
 * imperative dialog (alert/confirm/prompt) is dismissed. These hosts settle
 * by unmounting `<AlertDialog>` directly instead of transitioning Base UI's
 * `open` prop to `false`, so Base UI's own `finalFocus` restore never fires
 * (it only runs on an `open: true → false` transition, not on
 * unmount-without-close) — see DCMS-674. Restoring focus ourselves,
 * synchronously before the dialog unmounts, sidesteps that Base UI
 * lifecycle gap entirely.
 */
function captureTriggerElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreTriggerFocus(triggerElement: HTMLElement | null): void {
  if (triggerElement && triggerElement.isConnected) {
    triggerElement.focus();
  }
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
  triggerElement: HTMLElement | null;
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
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    pendingAlerts = [
      ...pendingAlerts,
      { id: nextAlertId++, message, resolve, triggerElement, ...options },
    ];
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
    restoreTriggerFocus(current.triggerElement);
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

export interface ConfirmOptions {
  /** Dialog heading; defaults to "Confirm". */
  title?: string;
  /** Label for the affirmative action; defaults to "OK". */
  confirmLabel?: string;
  /** Label for the negative action; defaults to "Cancel". */
  cancelLabel?: string;
  /** Styles the affirmative action as destructive (e.g. delete/unpublish). */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (confirmed: boolean) => void;
  triggerElement: HTMLElement | null;
}

let pendingConfirms: PendingConfirm[] = [];
let nextConfirmId = 1;
const confirmListeners = new Set<() => void>();

function subscribeToConfirms(listener: () => void) {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
}

function getPendingConfirms() {
  return pendingConfirms;
}

function emitConfirmsChanged() {
  for (const listener of confirmListeners) listener();
}

/**
 * Imperative replacement for `window.confirm`, usable from non-React code
 * (actions, hooks) and, unlike the native dialog, can't be silenced by the
 * browser's "Prevent this page from creating additional dialogs" checkbox
 * (DCMS-658). Queues the prompt on the nearest mounted `ConfirmDialogHost`
 * and resolves once the user answers. Falls back to `window.confirm` when no
 * host is mounted so callers (including tests that don't render the host)
 * keep working.
 *
 * One in-flight prompt resolves per call, unlike `window.confirm`'s
 * synchronous return, this is async, so callers must `await` it (or migrate
 * to a `.then`) instead of branching on the return value directly.
 *
 * Accepts an optional `signal`: callers that fire a confirm from an effect
 * (e.g. `useEditor`'s local-backup check) can pass the same
 * `AbortController` they abort on unmount, so a prompt whose caller has
 * since unmounted (route changed away before the user answered) auto-
 * settles as `false` and drains out of the queue instead of leaving a
 * dangling, click-blocking `AlertDialog` mounted at the app root forever
 * (DCMS-1063).
 */
export function confirmDialog(
  message: string,
  options: ConfirmOptions = {},
  signal?: AbortSignal,
): Promise<boolean> {
  if (confirmListeners.size === 0) {
    return Promise.resolve(window.confirm(message));
  }
  if (signal?.aborted) {
    return Promise.resolve(false);
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    const id = nextConfirmId++;
    const settle = (confirmed: boolean) => {
      pendingConfirms = pendingConfirms.filter(pending => pending.id !== id);
      emitConfirmsChanged();
      resolve(confirmed);
    };
    signal?.addEventListener('abort', () => settle(false), { once: true });
    pendingConfirms = [
      ...pendingConfirms,
      { id, message, resolve: settle, triggerElement, ...options },
    ];
    emitConfirmsChanged();
  });
}

/**
 * React hook form of {@link confirmDialog}, memoized so it can be listed in
 * `useCallback`/`useEffect` dependency arrays without re-triggering on every
 * render.
 */
export function useConfirm(): (
  message: string,
  options?: ConfirmOptions,
  signal?: AbortSignal,
) => Promise<boolean> {
  return React.useCallback(
    (message: string, options?: ConfirmOptions, signal?: AbortSignal) =>
      confirmDialog(message, options, signal),
    [],
  );
}

/**
 * Renders the queue fed by `confirmDialog`, one prompt at a time. Mount
 * exactly once, near the app root (`DecapCmsProvider` does this alongside
 * `AlertDialogHost`).
 */
export function ConfirmDialogHost(): React.ReactNode {
  const queue = React.useSyncExternalStore(subscribeToConfirms, getPendingConfirms, getPendingConfirms);
  const current = queue[0];

  if (!current) return null;

  const settle = (confirmed: boolean) => {
    restoreTriggerFocus(current.triggerElement);
    pendingConfirms = pendingConfirms.filter(pending => pending.id !== current.id);
    emitConfirmsChanged();
    current.resolve(confirmed);
  };

  return (
    <AlertDialog
      key={current.id}
      open
      onOpenChange={open => {
        // Escape / backdrop dismissal carries no explicit answer; treat it
        // like Cancel rather than silently no-op'ing the caller's promise.
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current.title ?? 'Confirm'}</AlertDialogTitle>
          <AlertDialogDescription>{current.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {current.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={current.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {current.confirmLabel ?? 'OK'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface PromptOptions {
  /** Dialog heading; defaults to "Prompt". */
  title?: string;
  /** Label for the affirmative action; defaults to "OK". */
  confirmLabel?: string;
  /** Label for the negative action; defaults to "Cancel". */
  cancelLabel?: string;
  /** Placeholder for the text input. */
  placeholder?: string;
  /** Initial value of the text input. */
  defaultValue?: string;
}

interface PendingPrompt extends PromptOptions {
  id: number;
  message: string;
  resolve: (value: string | null) => void;
  triggerElement: HTMLElement | null;
}

let pendingPrompts: PendingPrompt[] = [];
let nextPromptId = 1;
const promptListeners = new Set<() => void>();

function subscribeToPrompts(listener: () => void) {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

function getPendingPrompts() {
  return pendingPrompts;
}

function emitPromptsChanged() {
  for (const listener of promptListeners) listener();
}

/**
 * Imperative replacement for `window.prompt`, usable from non-React code
 * (actions, hooks) and, like {@link confirmDialog}, can't be silenced by the
 * browser's "Prevent this page from creating additional dialogs" checkbox
 * (DCMS-658). Queues the prompt on the nearest mounted `PromptDialogHost` and
 * resolves with the entered text, or `null` if cancelled/dismissed. Falls
 * back to `window.prompt` when no host is mounted so callers (including
 * tests that don't render the host) keep working.
 */
export function promptDialog(message: string, options: PromptOptions = {}): Promise<string | null> {
  if (promptListeners.size === 0) {
    return Promise.resolve(window.prompt(message, options.defaultValue));
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    pendingPrompts = [
      ...pendingPrompts,
      { id: nextPromptId++, message, resolve, triggerElement, ...options },
    ];
    emitPromptsChanged();
  });
}

/**
 * Renders the queue fed by `promptDialog`, one prompt at a time. Mount
 * exactly once, near the app root (`DecapCmsProvider` does this alongside
 * `AlertDialogHost`/`ConfirmDialogHost`).
 */
export function PromptDialogHost(): React.ReactNode {
  const queue = React.useSyncExternalStore(subscribeToPrompts, getPendingPrompts, getPendingPrompts);
  const current = queue[0];
  const [value, setValue] = React.useState(current?.defaultValue ?? '');

  React.useEffect(() => {
    setValue(current?.defaultValue ?? '');
    // Reset only when a new prompt is queued, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const settle = (result: string | null) => {
    restoreTriggerFocus(current.triggerElement);
    pendingPrompts = pendingPrompts.filter(pending => pending.id !== current.id);
    emitPromptsChanged();
    current.resolve(result);
  };

  return (
    <AlertDialog
      key={current.id}
      open
      onOpenChange={open => {
        // Escape / backdrop dismissal carries no explicit answer; treat it
        // like Cancel rather than silently no-op'ing the caller's promise.
        if (!open) settle(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current.title ?? 'Prompt'}</AlertDialogTitle>
          <AlertDialogDescription>{current.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          autoFocus
          value={value}
          placeholder={current.placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') settle(value);
          }}
        />
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => settle(null)}>
            {current.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant="default" onClick={() => settle(value)}>
            {current.confirmLabel ?? 'OK'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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

// Editor chrome (toolbar, header, sidebar) uses z-index up to 300, and some
// app-level portals (App.tsx modal root, third-party media widgets) go as
// high as 10500. z-index: 50 let those layers ride above this "modal"
// backdrop, so the backdrop failed to actually cover — and therefore
// couldn't intercept clicks on — the underlying chrome (DCMS-1632). Both the
// backdrop and popup need to clear every other stacking context in the app.
const modalZIndex = 100000;

const backdropClass = css`
  position: fixed;
  inset: 0;
  z-index: ${modalZIndex};
  background-color: rgb(0 0 0 / 0.1);
`;

const popupClass = css`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: ${modalZIndex};
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

/**
 * Base UI's Floating UI aria-hiding pass (`markOthers` in
 * `floating-ui-react/utils/markOthers.js`) is the mechanism that hides the
 * rest of the page from assistive tech while a modal popup is open; it walks
 * the DOM from `<body>` and marks every node outside the popup's own subtree
 * as `aria-hidden="true"` / `data-base-ui-inert`. That module keeps its
 * hidden/marked-element bookkeeping (`counters`, `markerCounterMap`,
 * `lockCount`) at module scope, shared by every Base UI popup in the app —
 * so a second popup's pass (or a fast open/settle/reopen cycle, which is
 * exactly what the local-backup restore prompt does: it fires from an async
 * effect the moment `localBackup` first resolves, DCMS-1820) can compute its
 * "outside" set from a DOM snapshot that's stale relative to this popup,
 * and mark this popup's own backdrop/content nodes as hidden instead of
 * only the sibling app root (`#nc-root`) the marking is meant to target.
 * Once that happens there's no further Base UI effect run to correct it —
 * the dialog stays visibly on screen but invisible to the accessibility
 * tree and unreachable by role-based automation for as long as it's open.
 *
 * Self-heal by stripping `aria-hidden`/`data-base-ui-inert` off the node
 * whenever Base UI (mis)applies them, without touching Base UI's own
 * focus-trap/Escape/outside-page-hiding behavior for `#nc-root`.
 */
function useNeverInertSelf<T extends HTMLElement>(): React.RefCallback<T> {
  const observerRef = React.useRef<MutationObserver | null>(null);

  // A callback ref, not `useRef` + `useEffect([])`: `AlertDialogPrimitive.Portal`
  // doesn't render its children on the commit the popup/backdrop first mount
  // in — `mounted` flips from false to true asynchronously inside Base UI's
  // own dialog store — so a plain `useEffect` with an empty dependency array
  // fires once while the ref is still null and never re-attaches once the
  // real node shows up. The callback ref runs exactly when React attaches
  // (and detaches) the node, whenever that happens.
  return React.useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const strip = () => {
      if (node.getAttribute('aria-hidden') === 'true') {
        node.removeAttribute('aria-hidden');
      }
      if (node.hasAttribute('data-base-ui-inert')) {
        node.removeAttribute('data-base-ui-inert');
      }
    };
    strip();

    const observer = new MutationObserver(strip);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-base-ui-inert'],
    });
    observerRef.current = observer;
  }, []);
}

export function AlertDialogContent({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogPrimitive.Popup>>): React.ReactNode {
  const backdropRef = useNeverInertSelf<HTMLDivElement>();
  const popupRef = useNeverInertSelf<HTMLDivElement>();

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        ref={backdropRef}
        data-slot="alert-dialog-backdrop"
        css={backdropClass}
      />
      <AlertDialogPrimitive.Popup
        ref={popupRef}
        data-slot="alert-dialog-content"
        aria-modal="true"
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
 *
 * Accepts an optional `signal`, mirroring {@link confirmDialog} (DCMS-1063):
 * callers that fire an alert from an entry-scoped handler (e.g. `useEditor`'s
 * "Publish blocked" check) can pass the same `AbortController` they abort on
 * unmount, so an alert whose caller has since unmounted (route changed away
 * before the user clicked OK) auto-settles and drains out of the queue
 * instead of leaving a dangling, click-blocking `AlertDialog` mounted at the
 * app root and stacking over whatever the next route renders (DCMS-2000).
 */
export function showAlert(
  message: string,
  options: AlertOptions = {},
  signal?: AbortSignal,
): Promise<void> {
  if (alertListeners.size === 0) {
    window.alert(message);
    return Promise.resolve();
  }
  if (signal?.aborted) {
    return Promise.resolve();
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    const id = nextAlertId++;
    const settle = () => {
      pendingAlerts = pendingAlerts.filter(pending => pending.id !== id);
      emitAlertsChanged();
      resolve();
    };
    signal?.addEventListener('abort', settle, { once: true });
    pendingAlerts = [...pendingAlerts, { id, message, resolve: settle, triggerElement, ...options }];
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
    (message: string, options?: ConfirmOptions, signal?: AbortSignal) => confirmDialog(message, options, signal),
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
  /**
   * Native input `type`, e.g. `'datetime-local'` for a browser date/time
   * picker instead of free text (used by scheduled publishing, DCMS-1991).
   * Defaults to `'text'`.
   */
  inputType?: string;
  /** Passed through to the input's `min` attribute (e.g. to block past dates/times). */
  min?: string;
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
 *
 * Accepts an optional `signal`, mirroring {@link confirmDialog} (DCMS-1063):
 * a caller that unmounts (route change) while its prompt is still pending
 * settles it as `null` and drains it from the queue instead of leaking a
 * dangling `AlertDialog` (DCMS-2000).
 */
export function promptDialog(
  message: string,
  options: PromptOptions = {},
  signal?: AbortSignal,
): Promise<string | null> {
  if (promptListeners.size === 0) {
    return Promise.resolve(window.prompt(message, options.defaultValue));
  }
  if (signal?.aborted) {
    return Promise.resolve(null);
  }
  const triggerElement = captureTriggerElement();
  return new Promise(resolve => {
    const id = nextPromptId++;
    const settle = (value: string | null) => {
      pendingPrompts = pendingPrompts.filter(pending => pending.id !== id);
      emitPromptsChanged();
      resolve(value);
    };
    signal?.addEventListener('abort', () => settle(null), { once: true });
    pendingPrompts = [...pendingPrompts, { id, message, resolve: settle, triggerElement, ...options }];
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
  // DCMS-1333: the `<Input>` below has no `<label>`/placeholder/name of its
  // own, so screen readers announced it as bare "edit". The description
  // already carries the caller's message (e.g. "Enter the URL of the
  // image"), so point the input's accessible name at it via
  // `aria-labelledby` rather than duplicating the text as a visible label.
  const descriptionId = React.useId();

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
          <AlertDialogDescription id={descriptionId}>{current.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          autoFocus
          type={current.inputType ?? 'text'}
          min={current.min}
          value={value}
          placeholder={current.placeholder}
          aria-labelledby={descriptionId}
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

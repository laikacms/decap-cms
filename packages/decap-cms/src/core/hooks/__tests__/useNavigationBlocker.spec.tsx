import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigationBlocker } from '@/core/hooks/useNavigationBlocker';
import { RouterProvider } from '@/core/routing/context';
import { ConfirmDialogHost } from '@/ui';

import type { Router, RouterBlocker, RouterTransition, RouterUpdate } from '@/core/routing/router';

/**
 * A controllable fake of the `Router` port, mirroring the pattern in
 * useEditor.navigation.spec.tsx: `push` holds the navigation for any armed
 * `block()` guard until the guard calls `transition.retry()`, and `subscribe`
 * fires only once a navigation actually lands (never on a held one) — the
 * same contract `useNavigationBlocker`'s cleanup-on-navigate subscribe relies
 * on. `withBlock` controls whether the fake exposes `block` at all, so tests
 * can exercise the router-has-no-`block` degrade path for real (not just by
 * stubbing it out) the same way an app shell without in-app interception
 * would.
 */
let blockers: RouterBlocker[] = [];
let listeners: ((update: RouterUpdate) => void)[] = [];
const fakeLocation = { pathname: '/collections/posts', search: '' };

function notify(action: RouterUpdate['action']) {
  [...listeners].forEach(listener => listener({ location: { ...fakeLocation }, action }));
}

function buildFakeRouter(withBlock: boolean): Router {
  const router: Router = {
    location: () => ({ ...fakeLocation }),
    push: vi.fn((path: string) => {
      const apply = () => {
        fakeLocation.pathname = path;
        notify('PUSH');
      };
      if (blockers.length) {
        const tx: RouterTransition = { location: { pathname: path, search: '' }, action: 'PUSH', retry: apply };
        [...blockers].forEach(blocker => blocker(tx));
        return;
      }
      apply();
    }),
    replace: vi.fn((path: string) => {
      fakeLocation.pathname = path;
      notify('REPLACE');
    }),
    href: (path: string) => `#${path}`,
    subscribe: vi.fn((listener: (update: RouterUpdate) => void) => {
      listeners.push(listener);
      const unsubscribe = vi.fn(() => {
        listeners = listeners.filter(l => l !== listener);
      });
      return unsubscribe;
    }),
  };
  if (withBlock) {
    router.block = vi.fn((blocker: RouterBlocker) => {
      blockers.push(blocker);
      const unblock = vi.fn(() => {
        blockers = blockers.filter(b => b !== blocker);
      });
      return unblock;
    });
  }
  return router;
}

function resetFakeRouter() {
  blockers = [];
  listeners = [];
  fakeLocation.pathname = '/collections/posts';
  fakeLocation.search = '';
}

function renderNavigationBlocker(
  options: {
    shouldBlock?: () => boolean,
    message?: string,
    confirmLabel?: string,
    cancelLabel?: string,
    onNavigate?: () => void,
    allowedPaths?: string[],
  },
  router: Router,
) {
  const shouldBlock = options.shouldBlock ?? (() => true);
  const message = options.message ?? 'You have unsaved changes.';
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RouterProvider router={router}>{children}</RouterProvider>
  );
  const { result } = renderHook(
    () =>
      useNavigationBlocker({
        shouldBlock,
        message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        onNavigate: options.onNavigate,
        allowedPaths: options.allowedPaths,
      }),
    { wrapper },
  );
  return { result, router, message };
}

/**
 * `setupBlocker` registers its `beforeunload` handler via `window.addEventListener`
 * rather than returning it, so we intercept the real registration through a
 * spy and invoke the captured function directly with a plain event-like
 * object. This sidesteps jsdom coercing `Event#returnValue` to a boolean
 * (verified empirically against the installed jsdom): the hook's legacy
 * string-message contract for `beforeunload` can only be observed by calling
 * the handler with a controllable object, not by dispatching a real DOM event.
 */
function getBeforeUnloadHandler(addSpy: ReturnType<typeof vi.spyOn>) {
  const call = addSpy.mock.calls.find(([type]) => type === 'beforeunload');
  if (!call) throw new Error('beforeunload listener was not registered');
  return call[1] as (event: BeforeUnloadEvent) => string | undefined;
}

describe('useNavigationBlocker', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetFakeRouter();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    // `confirmDialog` falls back to `window.confirm` when no `ConfirmDialogHost`
    // is mounted (which is the case here), so spying on `window.confirm` is
    // the documented way to drive/observe it from outside React (DCMS-658).
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks beforeunload (sets returnValue to the message) when shouldBlock() is true', () => {
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    const handler = getBeforeUnloadHandler(addEventListenerSpy);
    const event = { returnValue: undefined } as unknown as BeforeUnloadEvent;
    const returned = handler(event);

    expect(event.returnValue).toBe('Unsaved!');
    expect(returned).toBe('Unsaved!');
  });

  it('does not touch beforeunload when shouldBlock() is false', () => {
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => false, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    const handler = getBeforeUnloadHandler(addEventListenerSpy);
    const event = { returnValue: undefined } as unknown as BeforeUnloadEvent;
    const returned = handler(event);

    expect(event.returnValue).toBeUndefined();
    expect(returned).toBeUndefined();
  });

  it('router.block path: retries and unblocks the transition once shouldBlock() turns false', () => {
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => false }, router);

    act(() => {
      result.current.setupBlocker();
    });

    const unblock = vi.mocked(router.block!).mock.results[0].value;

    act(() => {
      router.push('/collections/other');
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    // Unblocking happens twice here: once directly in the `else` branch
    // before `tx.retry()`, and once more when that synchronous `retry()`
    // lands the navigation and the `router.subscribe` listener runs its own
    // `cleanup()` (the ref isn't nulled until `cleanup()` does it) — both
    // calls target the same idempotent unblock function, so this is safe by
    // construction rather than by an explicit guard.
    expect(unblock).toHaveBeenCalledTimes(2);
    expect(fakeLocation.pathname).toBe('/collections/other');
  });

  it('router.block path: gates the retry on the confirm dialog when shouldBlock() is true', async () => {
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    confirmSpy.mockReturnValue(false);
    await act(async () => {
      router.push('/collections/other');
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // Cancelled: `tx.retry()` was never called, so the location must not
    // have advanced.
    expect(fakeLocation.pathname).toBe('/collections/posts');

    confirmSpy.mockClear();
    confirmSpy.mockReturnValue(true);
    await act(async () => {
      router.push('/collections/other');
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(fakeLocation.pathname).toBe('/collections/other');
  });

  it('bypasses the blocker for allowedPaths on a PUSH even when shouldBlock() is true', () => {
    const router = buildFakeRouter(true);
    const onNavigate = vi.fn();
    const { result } = renderNavigationBlocker(
      { shouldBlock: () => true, allowedPaths: ['/collections/allowed'], onNavigate },
      router,
    );

    act(() => {
      result.current.setupBlocker();
    });

    act(() => {
      router.push('/collections/allowed/new');
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fakeLocation.pathname).toBe('/collections/allowed/new');
    // The `subscribe` listener applies the same allowedPaths+PUSH exemption,
    // so the navigate-away cleanup (onNavigate + unlisten) must not fire for
    // an allowed PUSH either.
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('degrades to beforeunload-only protection when router.block is undefined', () => {
    const router = buildFakeRouter(false);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    expect(router.block).toBeUndefined();

    const handler = getBeforeUnloadHandler(addEventListenerSpy);
    const event = { returnValue: undefined } as unknown as BeforeUnloadEvent;
    handler(event);
    expect(event.returnValue).toBe('Unsaved!');

    // With no `block` to intercept it, in-app navigation goes straight
    // through — no confirm dialog, no held transition.
    act(() => {
      router.push('/collections/other');
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fakeLocation.pathname).toBe('/collections/other');
  });

  it('cleanup unregisters both the beforeunload listener and the router guards', () => {
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true }, router);

    let cleanup = () => {};
    act(() => {
      cleanup = result.current.setupBlocker();
    });

    const handler = getBeforeUnloadHandler(addEventListenerSpy);
    const unblock = vi.mocked(router.block!).mock.results[0].value;
    // `RouterProvider` itself calls `router.subscribe` once on mount (to
    // sync `location` on navigation), before our hook's `setupBlocker()`
    // makes its own call — so the subscribe registered by this hook is the
    // *last* recorded call, not the first.
    const subscribeResults = vi.mocked(router.subscribe).mock.results;
    const unsubscribe = subscribeResults[subscribeResults.length - 1].value;

    act(() => {
      cleanup();
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', handler);
    expect(unblock).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('a later manual cleanup() call after navigation is a safe no-op (refs already nulled)', () => {
    // Regression guard for the ordering the exhaustive-deps disable comment
    // calls out: `tx.retry()` re-triggers navigation, which fires the
    // `subscribe` listener's own `cleanup()` and nulls both refs. A
    // subsequent, separately-triggered `cleanup()` call (e.g. an unmount
    // effect racing the navigation) must not reach the router's unblock/
    // unsubscribe functions again.
    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => false }, router);

    act(() => {
      result.current.setupBlocker();
    });

    const unblock = vi.mocked(router.block!).mock.results[0].value;

    act(() => {
      router.push('/collections/other');
    });

    // Direct call in the `else` branch + the subscribe-triggered cascade.
    expect(unblock).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.cleanup();
    });

    expect(unblock).toHaveBeenCalledTimes(2);
  });
});

describe('useNavigationBlocker confirmLabel/cancelLabel passthrough (DCMS-2031)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the caller-supplied labels instead of the generic OK/Cancel defaults when provided', async () => {
    resetFakeRouter();
    render(<ConfirmDialogHost />);

    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker(
      {
        shouldBlock: () => true,
        message: 'Unsaved!',
        confirmLabel: 'Leave page',
        cancelLabel: 'Stay on this page',
      },
      router,
    );

    act(() => {
      result.current.setupBlocker();
    });

    act(() => {
      router.push('/collections/other');
    });

    await screen.findByRole('alertdialog');

    expect(screen.getByRole('button', { name: 'Leave page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay on this page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    // Settle the prompt so it drains from `ConfirmDialogHost`'s module-scoped
    // queue instead of leaking into a later test in this file.
    act(() => {
      screen.getByRole('button', { name: 'Stay on this page' }).click();
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('falls back to the generic OK/Cancel defaults when no labels are supplied (unchanged behaviour)', async () => {
    resetFakeRouter();
    render(<ConfirmDialogHost />);

    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    act(() => {
      router.push('/collections/other');
    });

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    act(() => {
      within(dialog).getByRole('button', { name: 'Cancel' }).click();
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});

describe('useNavigationBlocker confirmDialog cleanup (DCMS-1804)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('caller unmounts while the "Unsaved changes" prompt is open: the prompt drains and the AlertDialog unmounts', async () => {
    resetFakeRouter();
    // `ConfirmDialogHost` is a module-singleton queue consumer; mounting it
    // makes `confirmDialog(...)` queue a real (pending, unanswered) dialog
    // instead of the synchronous `window.confirm` fallback used by the rest
    // of this file's tests (DCMS-658).
    render(<ConfirmDialogHost />);

    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    let cleanup = () => {};
    act(() => {
      cleanup = result.current.setupBlocker();
    });

    // Trigger a blocked navigation. Deliberately not awaited: the real repro
    // is the user pressing browser Back *before* answering Cancel/OK, so the
    // confirm must still be pending when we simulate that below.
    act(() => {
      router.push('/collections/other');
    });

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Unsaved!');

    // Simulate the caller being abandoned mid-prompt by a subsequent
    // navigation (e.g. `useEditor`'s route-change subscribe firing `cleanup`
    // on browser Back) or an outright unmount, before the user answers.
    act(() => {
      cleanup();
    });

    // Without the DCMS-1804 fix, the confirm promise never settles,
    // `ConfirmDialogHost` keeps rendering the AlertDialog at the app root,
    // and its backdrop leaks and intercepts all subsequent clicks.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('cancel-path behavior is unchanged: answering Cancel still settles the prompt without needing cleanup()', async () => {
    resetFakeRouter();
    render(<ConfirmDialogHost />);

    const router = buildFakeRouter(true);
    const { result } = renderNavigationBlocker({ shouldBlock: () => true, message: 'Unsaved!' }, router);

    act(() => {
      result.current.setupBlocker();
    });

    act(() => {
      router.push('/collections/other');
    });

    const dialog = await screen.findByRole('alertdialog');
    const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });

    act(() => {
      cancelButton.click();
    });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    // Cancelling must not have advanced the route.
    expect(fakeLocation.pathname).toBe('/collections/posts');
  });
});

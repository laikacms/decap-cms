import { Toast } from '@base-ui/react/toast';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { toast, Toaster, toastManager } from '@/ui/toast';

/**
 * Behavior spec for `src/ui/toast.tsx` — the Base UI Toast wrapper that
 * replaces `react-toastify` (DCMS-546, #632). Covers the imperative
 * `toast.*` API, auto-dismiss, dismissable close, stacking, and the
 * `role="status"` / `role="alert"` accessibility contract.
 */
describe('toast', () => {
  afterEach(() => {
    act(() => {
      toastManager.close();
    });
  });

  it('renders a toast added via the imperative API', async () => {
    render(<Toaster />);

    act(() => {
      toast('Plain notice');
    });

    expect(await screen.findByText('Plain notice')).toBeInTheDocument();
  });

  it('reflects role="status" for success/info/default and role="alert" for error/warning', async () => {
    render(<Toaster />);

    act(() => {
      toast.success('Saved');
      toast.info('Heads up');
      toast.error('Broken');
      toast.warning('Careful');
    });

    await waitFor(() => {
      expect(screen.getByText('Saved').closest('[role]')).toHaveAttribute('role', 'status');
      expect(screen.getByText('Heads up').closest('[role]')).toHaveAttribute('role', 'status');
      expect(screen.getByText('Broken').closest('[role]')).toHaveAttribute('role', 'alert');
      expect(screen.getByText('Careful').closest('[role]')).toHaveAttribute('role', 'alert');
    });
  });

  it('is dismissable via the close button', async () => {
    const user = userEvent.setup();
    render(<Toaster />);

    act(() => {
      toast('Dismiss me');
    });

    await screen.findByText('Dismiss me');
    // The close button is `aria-hidden` until the viewport is expanded
    // (hovered/focused) — mirrors the stacked-toast UX contract. The
    // viewport itself is `pointer-events: none` (clicks pass through to the
    // page), so trigger the expand via a raw mouseenter instead of a
    // pointer-hit-testing `userEvent.hover`.
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Notifications' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    await waitFor(() => {
      expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
    });
  });

  it('stacks multiple toasts', async () => {
    render(<Toaster />);

    act(() => {
      toast('First');
      toast('Second');
    });

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(await screen.findByText('Second')).toBeInTheDocument();
  });

  it('auto-dismisses after the given timeout', async () => {
    render(<Toaster />);

    act(() => {
      toast('Fleeting', { timeout: 10 });
    });

    await screen.findByText('Fleeting');

    await waitFor(
      () => {
        expect(screen.queryByText('Fleeting')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('calls onRemove once the toast has left the viewport', async () => {
    render(<Toaster />);
    let removed = false;

    act(() => {
      toast('Tracked', {
        timeout: 10,
        onRemove: () => {
          removed = true;
        },
      });
    });

    await screen.findByText('Tracked');

    await waitFor(
      () => {
        expect(removed).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it('exposes the underlying Base UI Toast namespace for advanced composition', () => {
    expect(Toast.Provider).toBeDefined();
    expect(Toast.Root).toBeDefined();
    expect(Toast.Viewport).toBeDefined();
  });
});

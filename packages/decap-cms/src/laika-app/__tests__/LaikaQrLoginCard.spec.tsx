import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as backendModule from '@/core/backend';
import LaikaQrLoginCard from '@/laika-app/LaikaQrLoginCard';

vi.mock('../../core/backend');

const { toDataURL } = vi.hoisted(() => ({
  toDataURL: vi.fn((text: string) => Promise.resolve(`data:image/png;base64,mock-qr:${text}`)),
}));
vi.mock('qrcode', () => ({ default: { toDataURL }, toDataURL }));

const mockState: { config: unknown } = { config: null };

vi.mock('../../core/hooks/useRedux', () => ({
  useAppSelector: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

const currentBackend = vi.mocked(backendModule.currentBackend);

function laikaConfig() {
  return { backend: { name: 'laika' } } as unknown;
}

describe('LaikaQrLoginCard', () => {
  beforeEach(() => {
    mockState.config = null;
    currentBackend.mockReset();
    toDataURL.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when the backend is not laika', () => {
    mockState.config = { backend: { name: 'github' } };
    const { container } = render(<LaikaQrLoginCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when config is missing', () => {
    mockState.config = null;
    const { container } = render(<LaikaQrLoginCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('goes idle -> loading -> ready on the happy path', async () => {
    mockState.config = laikaConfig();
    const createQrLoginTransfer = vi.fn().mockResolvedValue({
      code: 'abc123',
      expiresAt: Date.now() + 120_000,
    });
    currentBackend.mockReturnValue({ implementation: { createQrLoginTransfer } } as never);

    render(<LaikaQrLoginCard />);

    expect(screen.getByText('No active code')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Show QR code'));
    });

    await waitFor(() => {
      expect(screen.getByAltText('Scan to sign in on another device')).toBeInTheDocument();
    });

    expect(createQrLoginTransfer).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Expires in \d+s · single use/)).toBeInTheDocument();
  });

  it('falls back to an error state when the backend lacks createQrLoginTransfer', async () => {
    mockState.config = laikaConfig();
    currentBackend.mockReturnValue({ implementation: {} } as never);

    render(<LaikaQrLoginCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Show QR code'));
    });

    await waitFor(() => {
      expect(screen.getByText('This backend does not support QR login yet.')).toBeInTheDocument();
    });
  });

  it('surfaces a rejected Error message', async () => {
    mockState.config = laikaConfig();
    const createQrLoginTransfer = vi.fn().mockRejectedValue(new Error('network blew up'));
    currentBackend.mockReturnValue({ implementation: { createQrLoginTransfer } } as never);

    render(<LaikaQrLoginCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Show QR code'));
    });

    await waitFor(() => {
      expect(screen.getByText('network blew up')).toBeInTheDocument();
    });
  });

  it('falls back to a generic message for a non-Error throw', async () => {
    mockState.config = laikaConfig();
    const createQrLoginTransfer = vi.fn().mockRejectedValue('nope');
    currentBackend.mockReturnValue({ implementation: { createQrLoginTransfer } } as never);

    render(<LaikaQrLoginCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Show QR code'));
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to generate a QR login code.')).toBeInTheDocument();
    });
  });

  it('discards a stale in-flight response when a newer generate() call resolves first', async () => {
    mockState.config = laikaConfig();

    let resolveFirst!: (value: { code: string, expiresAt: number }) => void;
    const firstPromise = new Promise<{ code: string, expiresAt: number }>(resolve => {
      resolveFirst = resolve;
    });

    const createQrLoginTransfer = vi.fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => Promise.resolve({ code: 'second', expiresAt: Date.now() + 120_000 }));

    currentBackend.mockReturnValue({ implementation: { createQrLoginTransfer } } as never);

    render(<LaikaQrLoginCard />);

    const button = screen.getByText('Show QR code');

    // Both clicks are dispatched synchronously inside one `act` call, so
    // React hasn't committed the `loading` state (and disabled the button)
    // between them yet — this reproduces two overlapping generate() calls,
    // requestId 1 then requestId 2, exactly like a rapid double-click would.
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(createQrLoginTransfer).toHaveBeenCalledTimes(2);

    // The second (latest) request already resolved. Now let the first
    // (stale) request resolve too and confirm it does not clobber state.
    await act(async () => {
      resolveFirst({ code: 'first', expiresAt: Date.now() + 120_000 });
      await firstPromise;
    });

    await waitFor(() => {
      expect(screen.getByAltText('Scan to sign in on another device')).toBeInTheDocument();
    });
    const img = screen.getByAltText('Scan to sign in on another device') as HTMLImageElement;
    expect(img.src).toContain('second');
    expect(img.src).not.toContain('first');
  });

  it('countdown transitions ready -> expired once transfer.expiresAt passes', async () => {
    vi.useFakeTimers();
    mockState.config = laikaConfig();
    const createQrLoginTransfer = vi.fn().mockResolvedValue({
      code: 'abc123',
      expiresAt: Date.now() + 2000,
    });
    currentBackend.mockReturnValue({ implementation: { createQrLoginTransfer } } as never);

    render(<LaikaQrLoginCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Show QR code'));
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByAltText('Scan to sign in on another device')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText('Code expired')).toBeInTheDocument();
  });
});

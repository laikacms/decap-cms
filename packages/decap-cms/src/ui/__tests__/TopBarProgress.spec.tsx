import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TopBarProgress } from '@/ui/TopBarProgress';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

function barWidth(): number {
  return parseFloat(screen.getByRole('progressbar').style.width);
}

describe('TopBarProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMatchMedia(false);
  });

  afterEach(() => {
    // Flush any pending fade-out so the singleton bar never leaks into the
    // next test (module-level state persists across tests in this file).
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a trickling bar while mounted', () => {
    const { unmount } = render(<TopBarProgress />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    const initial = barWidth();
    expect(initial).toBeGreaterThan(0);

    vi.advanceTimersByTime(1000);
    const trickled = barWidth();
    expect(trickled).toBeGreaterThan(initial);
    expect(trickled).toBeLessThan(100);

    unmount();
  });

  it('fills to 100%, fades, and removes the bar after unmount', () => {
    const { unmount } = render(<TopBarProgress />);
    unmount();

    const bar = screen.getByRole('progressbar');
    expect(bar.style.width).toBe('100%');
    expect(bar.style.opacity).toBe('0');

    vi.advanceTimersByTime(500);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('restarts the same bar when navigation begins during the fade-out', () => {
    const { unmount } = render(<TopBarProgress />);
    unmount();
    vi.advanceTimersByTime(100);

    const remounted = render(<TopBarProgress />);
    expect(screen.getByRole('progressbar').style.opacity).toBe('1');
    expect(barWidth()).toBeLessThan(100);

    // The cancelled fade-out's removal must never fire.
    vi.advanceTimersByTime(2000);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);

    remounted.unmount();
    vi.advanceTimersByTime(500);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shares one bar across concurrent instances', () => {
    const first = render(<TopBarProgress />);
    const second = render(<TopBarProgress />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);

    first.unmount();
    expect(screen.getByRole('progressbar').style.opacity).toBe('1');

    second.unmount();
    vi.advanceTimersByTime(500);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders a static bar and removes it immediately under reduced motion', () => {
    stubMatchMedia(true);
    const { unmount } = render(<TopBarProgress />);

    const bar = screen.getByRole('progressbar');
    expect(bar.style.width).toBe('100%');
    expect(bar.style.transition).toBe('none');

    vi.advanceTimersByTime(1000);
    expect(bar.style.width).toBe('100%');

    unmount();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

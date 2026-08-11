import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OfflineIndicator } from '@/core/components/UI/OfflineIndicator';

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('OfflineIndicator', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = window.navigator.onLine;
  });

  afterEach(() => {
    setNavigatorOnLine(originalOnLine);
  });

  it('renders nothing while online', () => {
    setNavigatorOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });

  it('renders a status badge while offline', () => {
    setNavigatorOnLine(false);
    render(<OfflineIndicator />);
    const badge = screen.getByTestId('offline-indicator');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Offline');
    expect(badge.getAttribute('role')).toBe('status');
  });

  it('appears and disappears as connectivity changes', () => {
    setNavigatorOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByTestId('offline-indicator')).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-indicator')).not.toBeNull();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });
});

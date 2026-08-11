import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useOnlineStatus } from '@/core/hooks/useOnlineStatus';

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function Probe({ onRender }: { onRender: (isOnline: boolean) => void }) {
  const isOnline = useOnlineStatus();
  onRender(isOnline);
  return <span data-testid="online">{isOnline ? 'online' : 'offline'}</span>;
}

describe('useOnlineStatus', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = window.navigator.onLine;
  });

  afterEach(() => {
    setNavigatorOnLine(originalOnLine);
  });

  it('reads the initial navigator.onLine value', () => {
    setNavigatorOnLine(false);
    const values: boolean[] = [];
    const { getByTestId } = render(<Probe onRender={v => values.push(v)} />);
    expect(getByTestId('online').textContent).toBe('offline');
    expect(values[0]).toBe(false);
  });

  it('flips to false when the window "offline" event fires', () => {
    setNavigatorOnLine(true);
    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('online').textContent).toBe('online');

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(getByTestId('online').textContent).toBe('offline');
  });

  it('flips back to true when the window "online" event fires', () => {
    setNavigatorOnLine(false);
    const { getByTestId } = render(<Probe onRender={() => {}} />);
    expect(getByTestId('online').textContent).toBe('offline');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(getByTestId('online').textContent).toBe('online');
  });

  it('removes its listeners on unmount', () => {
    const addSpy = window.addEventListener;
    const calls: string[] = [];
    window.addEventListener = ((type: string, ...rest: unknown[]) => {
      calls.push(type);
      return addSpy.apply(window, [type, ...rest] as Parameters<typeof addSpy>);
    }) as typeof window.addEventListener;

    const { unmount } = render(<Probe onRender={() => {}} />);
    expect(calls).toEqual(expect.arrayContaining(['online', 'offline']));
    window.addEventListener = addSpy;
    unmount();
  });
});

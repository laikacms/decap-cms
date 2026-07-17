import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegisteredShortcuts, useShortcut, useSuspendShortcuts } from '@/core/hooks/useShortcut';
import { getRegisteredShortcuts, resetShortcutsForTests } from '@/core/lib/shortcuts';

import type { Shortcut } from '@/core/lib/shortcuts';

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

function Registrar({ shortcut }: { shortcut: Shortcut | null }) {
  useShortcut(shortcut);
  return null;
}

describe('useShortcut', () => {
  beforeEach(() => resetShortcutsForTests());
  afterEach(() => resetShortcutsForTests());

  it('registers on mount and unregisters on unmount', () => {
    const { unmount } = render(
      <Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run: () => undefined }} />,
    );
    expect(getRegisteredShortcuts()).toHaveLength(1);
    unmount();
    expect(getRegisteredShortcuts()).toHaveLength(0);
  });

  it('does nothing when passed null', () => {
    render(<Registrar shortcut={null} />);
    expect(getRegisteredShortcuts()).toHaveLength(0);
  });

  it('run and when see the latest render without re-registering', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run: first }} />,
    );
    const registered = getRegisteredShortcuts()[0];
    rerender(<Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run: second }} />);
    // Same registration object — identity fields unchanged.
    expect(getRegisteredShortcuts()[0]).toBe(registered);
    press('x');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('re-registers when the sequence changes', () => {
    const run = vi.fn();
    const { rerender } = render(
      <Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run }} />,
    );
    rerender(<Registrar shortcut={{ id: 't', sequence: 'y', label: 'X', run }} />);
    press('x');
    press('y');
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('useSuspendShortcuts', () => {
  beforeEach(() => resetShortcutsForTests());
  afterEach(() => resetShortcutsForTests());

  function Suspender({ active }: { active: boolean }) {
    useSuspendShortcuts(active);
    return null;
  }

  it('suspends while active and releases on unmount', () => {
    const run = vi.fn();
    render(<Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run }} />);
    const { unmount } = render(<Suspender active />);
    press('x');
    expect(run).not.toHaveBeenCalled();
    unmount();
    press('x');
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('useRegisteredShortcuts', () => {
  beforeEach(() => resetShortcutsForTests());
  afterEach(() => resetShortcutsForTests());

  it('re-renders as registrations change', () => {
    function Listing() {
      const shortcuts = useRegisteredShortcuts();
      return <div data-testid="count">{shortcuts.length}</div>;
    }
    const { getByTestId, rerender } = render(
      <>
        <Listing />
        <Registrar shortcut={null} />
      </>,
    );
    expect(getByTestId('count').textContent).toBe('0');
    rerender(
      <>
        <Listing />
        <Registrar shortcut={{ id: 't', sequence: 'x', label: 'X', run: () => undefined }} />
      </>,
    );
    expect(getByTestId('count').textContent).toBe('1');
  });
});

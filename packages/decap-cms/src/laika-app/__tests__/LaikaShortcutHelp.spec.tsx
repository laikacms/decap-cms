import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerShortcut, resetShortcutsForTests } from '@/core/lib/shortcuts';
import { LaikaShellProvider, useLaikaShell } from '@/laika-app/LaikaShellContext';
import LaikaShortcutHelp from '@/laika-app/LaikaShortcutHelp';

function OpenOnMount() {
  const { openShortcutHelp } = useLaikaShell();
  React.useEffect(() => {
    openShortcutHelp();
  }, [openShortcutHelp]);
  return null;
}

function renderHelp() {
  return render(
    <LaikaShellProvider>
      <OpenOnMount />
      <LaikaShortcutHelp />
    </LaikaShellProvider>,
  );
}

describe('LaikaShortcutHelp', () => {
  beforeEach(() => resetShortcutsForTests());
  afterEach(() => resetShortcutsForTests());

  it('lists registered shortcuts grouped, with formatted keys', () => {
    registerShortcut({
      id: 'nav',
      sequence: 'g d',
      label: 'Go to dashboard',
      group: 'Navigation',
      run: () => undefined,
    });
    registerShortcut({
      id: 'host',
      sequence: 'mod+e',
      label: 'Host-registered export',
      run: () => undefined,
    });
    const { getByText } = renderHelp();
    expect(getByText('Keyboard shortcuts')).toBeInTheDocument();
    expect(getByText('Navigation')).toBeInTheDocument();
    expect(getByText('Go to dashboard')).toBeInTheDocument();
    // Ungrouped shortcuts (e.g. from a host app) land under "Other".
    expect(getByText('Other')).toBeInTheDocument();
    expect(getByText('Host-registered export')).toBeInTheDocument();
    // jsdom is not Apple, so 'mod' renders as Ctrl.
    expect(getByText('Ctrl E')).toBeInTheDocument();
    expect(getByText('G')).toBeInTheDocument();
    expect(getByText('D')).toBeInTheDocument();
  });

  it('updates live when a shortcut is registered while open', () => {
    const { getByText, queryByText } = renderHelp();
    expect(queryByText('Late arrival')).toBeNull();
    act(() => {
      registerShortcut({ id: 'late', sequence: 'l', label: 'Late arrival', run: () => undefined });
    });
    expect(getByText('Late arrival')).toBeInTheDocument();
  });

  it('suspends other global shortcuts while open (LaikaDialog seam)', () => {
    const run = vi.fn();
    registerShortcut({ id: 'nav', sequence: 'g d', label: 'Go to dashboard', run });
    renderHelp();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true }));
    });
    expect(run).not.toHaveBeenCalled();
  });
});

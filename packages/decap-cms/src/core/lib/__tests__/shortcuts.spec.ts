import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attachShortcutTarget,
  formatSequence,
  getRegisteredShortcuts,
  isEditableTarget,
  parseSequence,
  registerShortcut,
  resetShortcutsForTests,
  SHORTCUT_CHORD_TIMEOUT_MS,
  subscribeToShortcuts,
  suspendShortcuts,
} from '@/core/lib/shortcuts';

function press(
  key: string,
  init: Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>> = {},
  target: EventTarget = document.body,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('parseSequence', () => {
  it('parses chords into keystrokes', () => {
    expect(parseSequence('g d')).toEqual([
      { key: 'g', mod: false, shift: false, alt: false },
      { key: 'd', mod: false, shift: false, alt: false },
    ]);
  });

  it('parses modifier combos', () => {
    expect(parseSequence('mod+shift+p')).toEqual([{ key: 'p', mod: true, shift: true, alt: false }]);
  });

  it('accepts cmd/ctrl/meta aliases for mod', () => {
    for (const alias of ['cmd+k', 'ctrl+k', 'meta+k']) {
      expect(parseSequence(alias)[0].mod).toBe(true);
    }
  });
});

describe('formatSequence', () => {
  it('renders one chunk per keystroke', () => {
    // jsdom is not an Apple platform, so the Ctrl spelling applies.
    expect(formatSequence('g d')).toEqual(['G', 'D']);
    expect(formatSequence('mod+s')).toEqual(['Ctrl S']);
    expect(formatSequence('escape')).toEqual(['Esc']);
    expect(formatSequence('arrowup')).toEqual(['↑']);
  });
});

describe('isEditableTarget', () => {
  it('treats INPUT elements as editable', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
  });

  it('treats TEXTAREA elements as editable', () => {
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
  });

  it('treats SELECT elements as editable', () => {
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('treats contentEditable elements as editable', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'isContentEditable', { value: true });
    expect(isEditableTarget(el)).toBe(true);
  });

  it('treats a plain div as non-editable', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
  });

  it('treats a null target as non-editable', () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('shortcut engine', () => {
  beforeEach(() => {
    resetShortcutsForTests();
  });

  afterEach(() => {
    resetShortcutsForTests();
    vi.useRealTimers();
  });

  it('runs a single-key shortcut and prevents default', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'n', label: 'New', run });
    const event = press('n');
    expect(run).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not run bare-key shortcuts when a modifier is held', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'j', label: 'Next', run });
    press('j', { metaKey: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('runs mod shortcuts with either meta or ctrl', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'mod+s', label: 'Save', run });
    press('s', { metaKey: true });
    press('s', { ctrlKey: true });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('completes two-key chords', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'g d', label: 'Dashboard', run });
    const prefix = press('g');
    expect(run).not.toHaveBeenCalled();
    expect(prefix.defaultPrevented).toBe(true);
    press('d');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('drops the chord prefix after the timeout', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'g d', label: 'Dashboard', run });
    press('g');
    vi.advanceTimersByTime(SHORTCUT_CHORD_TIMEOUT_MS + 1);
    press('d');
    expect(run).not.toHaveBeenCalled();
  });

  it('re-reads a key fresh when it breaks a chord', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'g d', label: 'Dashboard', run });
    press('g');
    press('g');
    press('d');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ignores bare modifier presses inside a chord', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'g d', label: 'Dashboard', run });
    press('g');
    press('Shift', { shiftKey: true });
    press('d');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('suppresses bare keys while typing but keeps mod combos', () => {
    const bare = vi.fn();
    const combo = vi.fn();
    registerShortcut({ id: 'bare', sequence: 'n', label: 'New', run: bare });
    registerShortcut({ id: 'combo', sequence: 'mod+s', label: 'Save', run: combo });
    const input = document.createElement('input');
    document.body.appendChild(input);
    press('n', {}, input);
    press('s', { metaKey: true }, input);
    expect(bare).not.toHaveBeenCalled();
    expect(combo).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('lets allowInInput opt a bare key into typing contexts', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'escape', label: 'Close', allowInInput: true, run });
    const input = document.createElement('input');
    document.body.appendChild(input);
    press('Escape', {}, input);
    expect(run).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('ignores keystrokes originating inside a modal', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'n', label: 'New', run });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    press('n', {}, button);
    expect(run).not.toHaveBeenCalled();
    dialog.remove();
  });

  it('suspends and releases', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'n', label: 'New', run });
    const release = suspendShortcuts();
    press('n');
    expect(run).not.toHaveBeenCalled();
    release();
    release(); // double release is a no-op
    press('n');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs allowWhileSuspended shortcuts during suspension and from modals', () => {
    const run = vi.fn();
    registerShortcut({
      id: 't',
      sequence: 'mod+k',
      label: 'Palette',
      allowInInput: true,
      allowWhileSuspended: true,
      run,
    });
    const release = suspendShortcuts();
    press('k', { metaKey: true });
    release();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    press('k', { metaKey: true }, dialog);
    expect(run).toHaveBeenCalledTimes(2);
    dialog.remove();
  });

  it('respects when()', () => {
    const run = vi.fn();
    let enabled = false;
    registerShortcut({ id: 't', sequence: 'n', label: 'New', when: () => enabled, run });
    press('n');
    enabled = true;
    press('n');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('replaces same-id registrations and survives the original dispose', () => {
    const first = vi.fn();
    const second = vi.fn();
    const disposeFirst = registerShortcut({ id: 't', sequence: 'n', label: 'New', run: first });
    registerShortcut({ id: 't', sequence: 'n', label: 'Override', run: second });
    disposeFirst();
    press('n');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(getRegisteredShortcuts()).toHaveLength(1);
  });

  it('prefers the last registered shortcut on sequence conflicts', () => {
    const shell = vi.fn();
    const host = vi.fn();
    registerShortcut({ id: 'shell', sequence: 'n', label: 'New', run: shell });
    registerShortcut({ id: 'host', sequence: 'n', label: 'Host new', run: host });
    press('n');
    expect(shell).not.toHaveBeenCalled();
    expect(host).toHaveBeenCalledTimes(1);
  });

  it('shift is tolerated on shifted characters without a shift token', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: '?', label: 'Help', run });
    press('?', { shiftKey: true });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on register and unregister', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToShortcuts(listener);
    const dispose = registerShortcut({ id: 't', sequence: 'n', label: 'New', run: () => undefined });
    dispose();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('routes keydowns from an attached iframe window through the engine', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'mod+s', label: 'Save', allowInInput: true, run });

    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const frameWindow = iframe.contentWindow!;
    const detach = attachShortcutTarget(frameWindow);

    const event = new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true });
    frameWindow.document.body.dispatchEvent(event);
    expect(run).toHaveBeenCalledTimes(1);
    // The browser's native save-page must not fire from inside the frame.
    expect(event.defaultPrevented).toBe(true);

    detach();
    frameWindow.document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(run).toHaveBeenCalledTimes(1);
    iframe.remove();
  });

  it('ignores events another handler already consumed', () => {
    const run = vi.fn();
    registerShortcut({ id: 't', sequence: 'n', label: 'New', run });
    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
    event.preventDefault();
    document.body.dispatchEvent(event);
    expect(run).not.toHaveBeenCalled();
  });
});

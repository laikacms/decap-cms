import { act, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the core redux hooks before importing, so LaikaShortcuts reads fake
// collections + config without needing a real Provider (same pattern as the
// LaikaCommandPalette spec).
const mockState = vi.hoisted(() => ({
  collections: {
    posts: {
      name: 'posts',
      label: 'Posts',
      type: 'folder_based_collection',
      create: true,
    },
    faqs: {
      name: 'faqs',
      label: 'FAQs',
      type: 'folder_based_collection',
    },
  },
  config: { publish_mode: 'simple' } as { publish_mode: string },
  mediaLibrary: { showMediaButton: true },
}));

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock('../../core/hooks/useRedux', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../core/actions/mediaLibrary', () => ({
  openMediaLibrary: vi.fn(() => ({ type: 'OPEN_MEDIA' })),
}));

vi.mock('../../core/actions/collections', () => ({
  createNewEntry: vi.fn(),
}));

// Import after the mocks so they apply.
import { createNewEntry } from '@/core/actions/collections';
import { resetShortcutsForTests } from '@/core/lib/shortcuts';
import { LaikaShellProvider, useLaikaShell } from '@/laika-app/LaikaShellContext';
import LaikaShortcuts from '@/laika-app/LaikaShortcuts';

function ShellProbe() {
  const { isCommandPaletteOpen, isShortcutHelpOpen } = useLaikaShell();
  const location = useLocation();
  return (
    <>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="palette">{String(isCommandPaletteOpen)}</div>
      <div data-testid="help">{String(isShortcutHelpOpen)}</div>
    </>
  );
}

function renderShortcuts(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LaikaShellProvider>
        <LaikaShortcuts />
        <ShellProbe />
      </LaikaShellProvider>
    </MemoryRouter>,
  );
}

function press(key: string, init: Partial<KeyboardEventInit> = {}, target: EventTarget = window) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

describe('LaikaShortcuts', () => {
  beforeEach(() => {
    resetShortcutsForTests();
    vi.clearAllMocks();
    mockState.config.publish_mode = 'simple';
  });
  afterEach(() => resetShortcutsForTests());

  it('g d navigates to the dashboard', () => {
    const { getByTestId } = renderShortcuts('/collections/posts');
    press('g');
    press('d');
    expect(getByTestId('pathname').textContent).toBe('/');
  });

  it('g s navigates to settings', () => {
    const { getByTestId } = renderShortcuts();
    press('g');
    press('s');
    expect(getByTestId('pathname').textContent).toBe('/settings');
  });

  it('g <number> jumps to the nth visible collection', () => {
    const { getByTestId } = renderShortcuts();
    press('g');
    press('2');
    expect(getByTestId('pathname').textContent).toBe('/collections/faqs');
  });

  it('a configured collection shortcut replaces its positional number', () => {
    (mockState.collections.posts as { shortcut?: string }).shortcut = 'P';
    try {
      const { getByTestId } = renderShortcuts();
      // Configured key works (uppercase in config, matched lowercased).
      press('g');
      press('p');
      expect(getByTestId('pathname').textContent).toBe('/collections/posts');
      // 'g 1' is dead now: Posts opted out of positional numbering.
      // (Leave the collection first so a stale positional chord would show.)
      press('g');
      press('d');
      press('g');
      press('1');
      expect(getByTestId('pathname').textContent).toBe('/');
      // FAQs keeps its positional number.
      press('g');
      press('2');
      expect(getByTestId('pathname').textContent).toBe('/collections/faqs');
    } finally {
      delete (mockState.collections.posts as { shortcut?: string }).shortcut;
    }
  });

  it('g w is only registered when editorial workflow is on', () => {
    const { getByTestId, unmount } = renderShortcuts();
    press('g');
    press('w');
    expect(getByTestId('pathname').textContent).toBe('/');
    unmount();

    mockState.config.publish_mode = 'editorial_workflow';
    const second = renderShortcuts();
    press('g');
    press('w');
    expect(second.getByTestId('pathname').textContent).toBe('/workflow');
  });

  it('g m dispatches the media library action', () => {
    renderShortcuts();
    press('g');
    press('m');
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_MEDIA' });
  });

  it('n creates a new entry only on a creatable collection route', () => {
    const { unmount } = renderShortcuts('/collections/faqs');
    press('n');
    expect(createNewEntry).not.toHaveBeenCalled();
    unmount();

    renderShortcuts('/collections/posts');
    press('n');
    expect(createNewEntry).toHaveBeenCalledWith('posts');
  });

  it('/ opens the command palette and ? toggles the help dialog', () => {
    const { getByTestId } = renderShortcuts();
    press('/');
    expect(getByTestId('palette').textContent).toBe('true');
    press('?', { shiftKey: true });
    expect(getByTestId('help').textContent).toBe('true');
    press('?', { shiftKey: true });
    expect(getByTestId('help').textContent).toBe('false');
  });

  it('bare keys are suppressed while typing in an input', () => {
    const { getByTestId } = renderShortcuts('/collections/posts');
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    press('g', {}, input);
    press('d', {}, input);
    press('n', {}, input);
    expect(getByTestId('pathname').textContent).toBe('/collections/posts');
    expect(createNewEntry).not.toHaveBeenCalled();
    input.remove();
  });
});

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock the core redux hooks before importing the palette, so the palette
// reads our fake collections + config without needing a real Provider.
const mockState = vi.hoisted(() => ({
  collections: {
    posts: {
      name: 'posts',
      label: 'Posts',
      type: 'folder_based_collection',
    },
    faqs: {
      name: 'faqs',
      label: 'FAQs',
      type: 'folder_based_collection',
    },
    meta: {
      name: 'meta',
      label: 'Meta',
      type: 'file_based_collection',
    },
  },
  config: { publish_mode: 'simple' } as { publish_mode: string, search?: boolean },
  mediaLibrary: { showMediaButton: true },
}));

vi.mock('../../core/hooks/useRedux', () => ({
  useAppDispatch: () => () => undefined,
  useAppSelector: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

// Stub the openMediaLibrary action so importing it works.
vi.mock('../../core/actions/mediaLibrary', () => ({
  openMediaLibrary: vi.fn(),
}));

vi.mock('../../core/actions/collections', () => ({
  searchCollections: vi.fn(),
}));

// Import after the mocks so they apply.
import LaikaCommandPalette from '@/laika-app/LaikaCommandPalette';
import { LaikaShellProvider } from '@/laika-app/LaikaShellContext';

// The palette's open state lives in LaikaShellContext, so every render
// needs the provider (the out-of-provider fallback is a no-op).
function renderPalette() {
  return render(
    <MemoryRouter>
      <LaikaShellProvider>
        <LaikaCommandPalette />
      </LaikaShellProvider>
    </MemoryRouter>,
  );
}

function fireCmdK() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  });
}

describe('LaikaCommandPalette', () => {
  it('opens on Cmd+K and lists nav items as combobox options', () => {
    const { getByRole, getAllByRole, queryByRole } = renderPalette();
    // Closed initially.
    expect(queryByRole('combobox')).toBeNull();

    fireCmdK();

    // Base UI Autocomplete wires the input up as a combobox over an inline
    // listbox (no popup, so no aria-expanded) with the first item highlighted.
    const input = getByRole('combobox');
    expect(input.getAttribute('placeholder')).toMatch(/Search collections/i);
    expect(input).toHaveAttribute('aria-controls', getByRole('listbox').id);
    expect(input).toHaveAttribute('aria-activedescendant');

    const options = getAllByRole('option');
    const labels = options.map(option => option.textContent);
    expect(labels.some(text => text?.includes('Dashboard'))).toBe(true);
    expect(labels.some(text => text?.includes('Posts'))).toBe(true);
    expect(labels.some(text => text?.includes('FAQs'))).toBe(true);
    expect(labels.some(text => text?.includes('Media library'))).toBe(true);
  });

  it('filters results as the user types', () => {
    const { getByRole, queryByText } = renderPalette();
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'faq' } });
    expect(queryByText('FAQs')).toBeInTheDocument();
    expect(queryByText('Posts')).toBeNull();
    expect(queryByText('Dashboard')).toBeNull();
  });

  it('surfaces a "search all" action when query is non-empty', () => {
    const { getByRole, getByText } = renderPalette();
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'taxes' } });
    expect(getByText(/Search all collections for "taxes"/)).toBeInTheDocument();
  });

  it('runs the item and closes the palette when an option is clicked', async () => {
    const { searchCollections } = await import('@/core/actions/collections');
    const { getByRole, getByText, queryByRole } = renderPalette();
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'taxes' } });
    fireEvent.click(getByText(/Search all collections for "taxes"/));

    expect(searchCollections).toHaveBeenCalledWith('taxes', '');
    // Selecting closes the palette.
    expect(queryByRole('combobox')).toBeNull();
  });

  it('offers no search actions when search is disabled in config', () => {
    mockState.config.search = false;
    try {
      const { getByRole, queryByText, getByText } = renderPalette();
      fireCmdK();
      fireEvent.change(getByRole('combobox'), { target: { value: 'faq' } });

      // Nav matches still work, but the search pivots are gone.
      expect(getByText('FAQs')).toBeInTheDocument();
      expect(queryByText(/Search all collections for/)).toBeNull();
    } finally {
      delete mockState.config.search;
    }
  });

  it('shows shortcut key hints on commands that have global shortcuts', () => {
    const { getAllByRole } = renderPalette();
    fireCmdK();
    const options = getAllByRole('option');
    const dashboard = options.find(option => option.textContent?.includes('Dashboard'));
    const kbds = Array.from(dashboard!.querySelectorAll('kbd')).map(kbd => kbd.textContent);
    expect(kbds).toEqual(['G', 'D']);
  });

  it('shows collection chord hints: configured key or positional number', () => {
    (mockState.collections.posts as { shortcut?: string }).shortcut = 'p';
    try {
      const { getAllByRole } = renderPalette();
      fireCmdK();
      const options = getAllByRole('option');
      const kbdsOf = (label: string) =>
        Array.from(
          options.find(option => option.textContent?.includes(label))!.querySelectorAll('kbd'),
          kbd => kbd.textContent,
        );
      expect(kbdsOf('Posts')).toEqual(['G', 'P']);
      expect(kbdsOf('FAQs')).toEqual(['G', '2']);
    } finally {
      delete (mockState.collections.posts as { shortcut?: string }).shortcut;
    }
  });

  it('offers App settings and Keyboard shortcuts commands', () => {
    const { getAllByRole } = renderPalette();
    fireCmdK();
    const labels = getAllByRole('option').map(option => option.textContent);
    expect(labels.some(text => text?.includes('App settings'))).toBe(true);
    expect(labels.some(text => text?.includes('Keyboard shortcuts'))).toBe(true);
  });

  it('resets the query when reopened after a Cmd+K toggle-close', () => {
    const { getByRole } = renderPalette();
    fireCmdK();
    fireEvent.change(getByRole('combobox'), { target: { value: 'taxes' } });

    fireCmdK(); // toggle closed
    fireCmdK(); // reopen

    expect((getByRole('combobox') as HTMLInputElement).value).toBe('');
  });
});

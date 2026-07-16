import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock the core redux hooks before importing the palette, so the palette
// reads our fake collections + config without needing a real Provider.
vi.mock('../../core/hooks/useRedux', () => {
  const state = {
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
    config: { publish_mode: 'simple' },
    mediaLibrary: { showMediaButton: true },
  };
  return {
    useAppDispatch: () => () => undefined,
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

// Stub the openMediaLibrary action so importing it works.
vi.mock('../../core/actions/mediaLibrary', () => ({
  openMediaLibrary: vi.fn(),
}));

vi.mock('../../core/actions/collections', () => ({
  searchCollections: vi.fn(),
}));

// Import after the mocks so they apply.
import LaikaCommandPalette from '@/laika-app/LaikaCommandPalette';

function fireCmdK() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  });
}

describe('LaikaCommandPalette', () => {
  it('opens on Cmd+K and lists nav items as combobox options', () => {
    const { getByRole, getAllByRole, queryByRole } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
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
    const { getByRole, queryByText } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'faq' } });
    expect(queryByText('FAQs')).toBeInTheDocument();
    expect(queryByText('Posts')).toBeNull();
    expect(queryByText('Dashboard')).toBeNull();
  });

  it('surfaces a "search all" action when query is non-empty', () => {
    const { getByRole, getByText } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'taxes' } });
    expect(getByText(/Search all collections for "taxes"/)).toBeInTheDocument();
  });

  it('runs the item and closes the palette when an option is clicked', async () => {
    const { searchCollections } = await import('@/core/actions/collections');
    const { getByRole, getByText, queryByRole } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    fireCmdK();
    const input = getByRole('combobox');

    fireEvent.change(input, { target: { value: 'taxes' } });
    fireEvent.click(getByText(/Search all collections for "taxes"/));

    expect(searchCollections).toHaveBeenCalledWith('taxes', '');
    // Selecting closes the palette.
    expect(queryByRole('combobox')).toBeNull();
  });
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
  it('opens on Cmd+K and lists nav items', () => {
    const { getByPlaceholderText, getByText, queryByPlaceholderText } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    // Closed initially.
    expect(queryByPlaceholderText(/Search collections/i)).toBeNull();

    fireCmdK();

    // Input + at least one navigation entry is visible.
    expect(getByPlaceholderText(/Search collections/i)).toBeInTheDocument();
    expect(getByText('Dashboard')).toBeInTheDocument();
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('FAQs')).toBeInTheDocument();
    expect(getByText('Media library')).toBeInTheDocument();
  });

  it('filters results as the user types', () => {
    const { getByPlaceholderText, queryByText } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    fireCmdK();
    const input = getByPlaceholderText(/Search collections/i);

    fireEvent.change(input, { target: { value: 'faq' } });
    expect(queryByText('FAQs')).toBeInTheDocument();
    expect(queryByText('Posts')).toBeNull();
    expect(queryByText('Dashboard')).toBeNull();
  });

  it('surfaces a "search all" action when query is non-empty', () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter>
        <LaikaCommandPalette />
      </MemoryRouter>,
    );
    fireCmdK();
    const input = getByPlaceholderText(/Search collections/i);

    fireEvent.change(input, { target: { value: 'taxes' } });
    expect(getByText(/Search all collections for "taxes"/)).toBeInTheDocument();
  });
});

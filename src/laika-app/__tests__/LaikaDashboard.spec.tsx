import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock react-polyglot's translate so the LaikaDashboard HOC wrapper receives
// a stub `t` that returns the key unchanged — no I18nProvider needed in the
// test tree.
vi.mock('react-polyglot', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

// Stub the redux hooks so the dashboard reads our fixture without needing
// a real store.
vi.mock('../../core/hooks/useRedux', () => {
  const state = {
    collections: {
      posts: {
        name: 'posts',
        label: 'Posts',
        description: 'Blog posts and articles.',
        type: 'folder_based_collection',
        create: true,
      },
      meta: {
        name: 'meta',
        label: 'Meta',
        type: 'file_based_collection',
        create: false,
      },
    },
    auth: { user: { name: 'Alice' } },
    config: { site_name: 'Test Site' },
  };
  return {
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

const createNewEntry = vi.fn();

vi.mock('../../core/actions/collections', () => ({
  createNewEntry: (...args: unknown[]) => createNewEntry(...args),
}));

import LaikaDashboard from '@/laika-app/LaikaDashboard';

describe('LaikaDashboard', () => {
  it('renders a personalized greeting + site name', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaDashboard />
      </MemoryRouter>,
    );
    expect(getByText('Welcome back, Alice')).toBeInTheDocument();
    expect(getByText(/Manage content for Test Site/i)).toBeInTheDocument();
  });

  it('renders one card per visible collection', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaDashboard />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('Blog posts and articles.')).toBeInTheDocument();
    expect(getByText('Meta')).toBeInTheDocument();
    expect(getByText('Single-file collection.')).toBeInTheDocument();
  });

  it('shows "Quick add" only for collections that allow creation', () => {
    const { getAllByText } = render(
      <MemoryRouter>
        <LaikaDashboard />
      </MemoryRouter>,
    );
    // 'posts' has create=true, 'meta' has create=false → exactly one quick-add.
    expect(getAllByText('app.header.quickAdd')).toHaveLength(1);
  });

  it('renders a Browse link per collection', () => {
    const { getAllByText } = render(
      <MemoryRouter>
        <LaikaDashboard />
      </MemoryRouter>,
    );
    expect(getAllByText('Browse')).toHaveLength(2);
  });

  it('calls createNewEntry directly (not via dispatch) when Quick add is clicked', () => {
    createNewEntry.mockClear();
    const { getByText } = render(
      <MemoryRouter>
        <LaikaDashboard />
      </MemoryRouter>,
    );
    fireEvent.click(getByText('app.header.quickAdd'));
    expect(createNewEntry).toHaveBeenCalledWith('posts');
  });
});

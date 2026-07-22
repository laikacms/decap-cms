import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import NotFoundPage from '@/core/components/NotFoundPage';
import { RouterProvider } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

describe('NotFoundPage', () => {
  it('renders a single h1 with the localized header for an unmatched route', () => {
    const { container, getByRole } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage />
      </RouterProvider>,
    );
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('app.notFoundPage.header');
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });

  it('renders a single h1 for an unknown collection route', () => {
    const { container, getByRole, getByText } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage collectionName="nonexistent-abc" />
      </RouterProvider>,
    );
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('app.notFoundPage.header');
    expect(getByText('app.notFoundPage.collectionNotFound')).toBeInTheDocument();
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });

  it('renders a single h1 for an unknown entry route', () => {
    const { container, getByRole, getByText } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage
          collectionName="posts"
          message="Entry not found: nonexistent-slug"
          backLink={{ to: '/collections/posts', label: 'posts' }}
        />
      </RouterProvider>,
    );
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('app.notFoundPage.header');
    expect(getByText('Entry not found: nonexistent-slug')).toBeInTheDocument();
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });
});

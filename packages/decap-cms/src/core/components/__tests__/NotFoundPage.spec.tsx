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

  it('renders a "Back to home" link for an unknown collection route (DCMS-1837)', () => {
    const { getByRole, getByText } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage collectionName="does-not-exist" backLink={{ to: '/' }} />
      </RouterProvider>,
    );

    expect(getByText('app.notFoundPage.collectionNotFound')).toBeInTheDocument();
    const link = getByRole('link', { name: 'app.notFoundPage.backToHome' });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('#/');
  });

  it('renders visibly-styled back links, not plain text, for both variants (DCMS-2169)', () => {
    const { getByRole, rerender } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage backLink={{ to: '/' }} />
      </RouterProvider>,
    );
    const homeLink = getByRole('link', { name: 'app.notFoundPage.backToHome' });
    expect(homeLink.className).not.toBe('');

    rerender(
      <RouterProvider router={createDefaultRouter()}>
        <NotFoundPage backLink={{ to: '/collections/posts', label: 'posts' }} />
      </RouterProvider>,
    );
    const collectionLink = getByRole('link', {
      name: 'app.notFoundPage.backToCollection',
    });
    expect(collectionLink.className).not.toBe('');
    // Both variants must share the same styling treatment (same emotion class).
    expect(collectionLink.className).toBe(homeLink.className);
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

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RouterProvider } from '@/core/routing/context';
import { NavLink } from '@/core/routing/Link';

import type { Router } from '@/core/routing/router';

function createTestRouter(pathname: string): Router {
  return {
    location: () => ({ pathname, search: '' }),
    push: vi.fn(),
    replace: vi.fn(),
    href: (path: string) => `#${path}`,
    subscribe: vi.fn(() => () => {}),
    block: vi.fn(() => () => {}),
  };
}

describe('NavLink', () => {
  it('renders aria-current="page" when the route matches exactly with `end`', () => {
    const { getByTestId } = render(
      <RouterProvider router={createTestRouter('/collections/posts')}>
        <NavLink to="/collections/posts" end data-testid="link">
          Posts
        </NavLink>
      </RouterProvider>,
    );

    expect(getByTestId('link')).toHaveAttribute('aria-current', 'page');
  });

  it('omits aria-current when the route does not match', () => {
    const { getByTestId } = render(
      <RouterProvider router={createTestRouter('/collections/pages')}>
        <NavLink to="/collections/posts" data-testid="link">
          Posts
        </NavLink>
      </RouterProvider>,
    );

    expect(getByTestId('link')).not.toHaveAttribute('aria-current');
  });

  it('omits aria-current for a sub-path when `end` is set', () => {
    const { getByTestId } = render(
      <RouterProvider router={createTestRouter('/collections/posts/entries/index')}>
        <NavLink to="/collections/posts" end data-testid="link">
          Posts
        </NavLink>
      </RouterProvider>,
    );

    expect(getByTestId('link')).not.toHaveAttribute('aria-current');
  });

  it('renders aria-current="page" for a matching sub-path when `end` is not set', () => {
    const { getByTestId } = render(
      <RouterProvider router={createTestRouter('/collections/posts/entries/index')}>
        <NavLink to="/collections/posts" data-testid="link">
          Posts
        </NavLink>
      </RouterProvider>,
    );

    expect(getByTestId('link')).toHaveAttribute('aria-current', 'page');
  });
});

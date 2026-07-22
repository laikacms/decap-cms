import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

vi.mock('@/core/hooks/useRedux', () => ({
  useAppDispatch: () => () => undefined,
}));

vi.mock('@/core/actions/status', () => ({
  checkBackendStatus: vi.fn(),
}));

vi.mock('@/core/components/UI', () => ({
  SettingsDropdown: () => <div data-testid="settings-dropdown" />,
}));

import { RouterProvider } from '@/core/routing/context';
import Header from '@/app/components/Header';

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

const baseProps = {
  user: { name: 'Alice' },
  collections: {
    posts: {
      name: 'posts',
      label: 'Posts',
      label_singular: 'Post',
      create: true,
    } as any,
  },
  onCreateEntryClick: vi.fn(),
  onLogoutClick: vi.fn(),
  openMediaLibrary: vi.fn(),
  hasWorkflow: true,
  isTestRepo: false,
  showMediaButton: true,
};

function renderHeaderAt(pathname: string) {
  return render(
    <RouterProvider router={createTestRouter(pathname)}>
      <Header {...baseProps} />
    </RouterProvider>,
  );
}

describe('Header nav aria-current (DCMS-1346)', () => {
  it.each(['/', '/collections/posts', '/collections/restaurants', '/media'])(
    'marks the Contents link aria-current="page" on %s',
    pathname => {
      renderHeaderAt(pathname);

      const contentLink = screen.getByLabelText('app.header.content');
      const workflowLink = screen.getByLabelText('app.header.workflow');

      expect(contentLink).toHaveAttribute('aria-current', 'page');
      expect(workflowLink).not.toHaveAttribute('aria-current');
    },
  );

  it('marks the Workflow link aria-current="page" on /workflow and leaves Contents unset', () => {
    renderHeaderAt('/workflow');

    const contentLink = screen.getByLabelText('app.header.content');
    const workflowLink = screen.getByLabelText('app.header.workflow');

    expect(workflowLink).toHaveAttribute('aria-current', 'page');
    expect(contentLink).not.toHaveAttribute('aria-current');
  });
});

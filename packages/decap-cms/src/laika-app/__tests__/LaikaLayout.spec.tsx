import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Stub the two heavy children — we just want to confirm LaikaLayout
// composes them and renders the `main` slot in between.
vi.mock('../LaikaSidebar', () => ({
  default: () => <div data-testid="laika-sidebar" />,
}));
vi.mock('../LaikaCommandPalette', () => ({
  default: () => <div data-testid="laika-palette" />,
}));
vi.mock('../LaikaShortcuts', () => ({
  default: () => <div data-testid="laika-shortcuts" />,
}));
vi.mock('../LaikaShortcutHelp', () => ({
  default: () => <div data-testid="laika-shortcut-help" />,
}));

// The layout resolves the sidebar's user scopes from the store through
// useCurrentUserScopes; stub it so no Redux Provider is needed here.
vi.mock('../../core/hooks/useCurrentUserScopes', () => ({
  useCurrentUserScopes: () => [],
}));

import LaikaLayout from '@/laika-app/LaikaLayout';

describe('LaikaLayout', () => {
  it('renders sidebar + main + command palette together', () => {
    const headerProps = {
      user: {},
      collections: {},
      onCreateEntryClick: () => undefined,
      onLogoutClick: () => undefined,
      openMediaLibrary: () => undefined,
      hasWorkflow: false,
    } as any;

    const { getByTestId, getByText } = render(
      <MemoryRouter>
        <LaikaLayout headerProps={headerProps} main={<div>main content</div>} />
      </MemoryRouter>,
    );

    expect(getByTestId('laika-sidebar')).toBeInTheDocument();
    expect(getByText('main content')).toBeInTheDocument();
    expect(getByTestId('laika-palette')).toBeInTheDocument();
    expect(getByTestId('laika-shortcuts')).toBeInTheDocument();
    expect(getByTestId('laika-shortcut-help')).toBeInTheDocument();
  });

  // DCMS-1651: the entry editor renders its own full-bleed toolbar over the
  // same viewport region as the sidebar (`EditorContainer` is
  // `position: absolute; top: 0; left: 0; width: 100%`). Leaving the sidebar
  // mounted there put an invisible `<aside>` on top of the editor's
  // breadcrumb `Posts` link, intercepting its clicks. The sidebar must be
  // unmounted (not just hidden) whenever `isEditorRoute` is true, mirroring
  // how the app-shell header is already unmounted for editor routes
  // (DCMS-431).
  it('unmounts the sidebar while an editor route is active', () => {
    const headerProps = {
      user: {},
      collections: {},
      onCreateEntryClick: () => undefined,
      onLogoutClick: () => undefined,
      openMediaLibrary: () => undefined,
      hasWorkflow: false,
    } as any;

    const { queryByTestId, getByText } = render(
      <MemoryRouter>
        <LaikaLayout
          headerProps={headerProps}
          main={<div>editor content</div>}
          isEditorRoute
        />
      </MemoryRouter>,
    );

    expect(queryByTestId('laika-sidebar')).not.toBeInTheDocument();
    expect(getByText('editor content')).toBeInTheDocument();
  });
});

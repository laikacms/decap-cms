import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

const mockState = vi.hoisted(() => ({
  collections: {
    posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' },
  },
  config: { search: true } as { search: boolean },
}));

vi.mock('../../core/hooks/useRedux', () => ({
  useAppSelector: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

import LaikaCollectionSearch from '@/laika-app/LaikaCollectionSearch';
import { LaikaShellProvider, useLaikaShell } from '@/laika-app/LaikaShellContext';

function renderSearch() {
  function PaletteProbe() {
    const { isCommandPaletteOpen } = useLaikaShell();
    return <div data-testid="palette-state">{isCommandPaletteOpen ? 'open' : 'closed'}</div>;
  }
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LaikaShellProvider>
        <LaikaCollectionSearch />
        <PaletteProbe />
      </LaikaShellProvider>
    </MemoryRouter>,
  );
}

describe('LaikaCollectionSearch', () => {
  afterEach(() => {
    mockState.config.search = true;
  });

  it('renders a palette trigger button with the global search label', () => {
    const { getByRole } = renderSearch();
    const trigger = getByRole('button', { name: 'collection.sidebar.searchAll' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    // A trigger, not a text input: there is nothing to type into here.
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('shows the command palette shortcut chip', () => {
    const { getByText } = renderSearch();
    // jsdom reports a non-Apple platform, so the chip reads Ctrl K.
    expect(getByText('Ctrl K')).toBeInTheDocument();
  });

  it('opens the command palette via the shell context when clicked', () => {
    const { getByRole, getByTestId } = renderSearch();
    expect(getByTestId('palette-state').textContent).toBe('closed');
    fireEvent.click(getByRole('button', { name: 'collection.sidebar.searchAll' }));
    expect(getByTestId('palette-state').textContent).toBe('open');
  });

  it('renders nothing when search is disabled in config', () => {
    mockState.config.search = false;
    const { queryByRole } = renderSearch();
    expect(queryByRole('button')).toBeNull();
  });
});

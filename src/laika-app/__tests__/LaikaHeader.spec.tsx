import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-polyglot', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

vi.mock('../../core/hooks/useRedux', () => ({
  useAppDispatch: () => () => undefined,
}));

vi.mock('../../core/actions/status', () => ({
  checkBackendStatus: vi.fn(),
}));

// Stub the core SettingsDropdown — just renders a marker so tests can
// confirm it's present without exercising its real implementation.
vi.mock('../../core/components/UI', () => ({
  SettingsDropdown: () => <div data-testid="settings-dropdown" />,
}));

const toggleMode = vi.fn();
const toggleMobileSidebar = vi.fn();

vi.mock('../LaikaThemeContext', () => ({
  useLaikaTheme: () => ({
    mode: 'light' as const,
    setMode: vi.fn(),
    toggleMode,
    resolvedMode: 'light' as const,
  }),
}));

vi.mock('../LaikaShellContext', () => ({
  useLaikaShell: () => ({
    isMobileSidebarOpen: false,
    openMobileSidebar: vi.fn(),
    closeMobileSidebar: vi.fn(),
    toggleMobileSidebar,
  }),
  LAIKA_BREAKPOINT_MOBILE: 900,
}));

import LaikaHeader from '../LaikaHeader';

const baseProps = {
  user: { name: 'Alice' },
  collections: {
    posts: {
      name: 'posts',
      label: 'Posts',
      label_singular: 'Post',
      create: true,
    } as any,
    drafts: {
      name: 'drafts',
      label: 'Drafts',
      create: false,
    } as any,
  },
  onCreateEntryClick: vi.fn(),
  onLogoutClick: vi.fn(),
  openMediaLibrary: vi.fn(),
  hasWorkflow: false,
  isTestRepo: false,
  showMediaButton: true,
};

describe('LaikaHeader', () => {
  it('shows the Media link when showMediaButton is true', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByText('app.header.media')).toBeInTheDocument();
  });

  it('hides the Workflow link when hasWorkflow is false', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} hasWorkflow={false} />
      </MemoryRouter>,
    );
    expect(queryByText('app.header.workflow')).toBeNull();
  });

  it('shows the Workflow link when hasWorkflow is true', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} hasWorkflow={true} />
      </MemoryRouter>,
    );
    expect(getByText('app.header.workflow')).toBeInTheDocument();
  });

  it('shows the quick-add button when at least one collection allows create', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByText('app.header.quickAdd')).toBeInTheDocument();
  });

  it('wires menu ARIA semantics on the quick-add trigger and its popover (DCMS-311)', () => {
    const { getByText, container } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );

    const trigger = getByText('app.header.quickAdd').closest('[role="button"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const menuId = trigger.getAttribute('aria-controls');
    expect(menuId).toBeTruthy();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const menu = container.querySelector('[role="menu"]');
    expect(menu).toBeTruthy();
    expect(menu?.id).toBe(menuId);
    expect(menu?.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
  });

  it('hides the quick-add when no collection allows create', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaHeader
          {...baseProps}
          collections={{
            drafts: { name: 'drafts', label: 'Drafts', create: false } as any,
          }}
        />
      </MemoryRouter>,
    );
    expect(queryByText('app.header.quickAdd')).toBeNull();
  });

  it('toggles theme mode when the theme toggle is clicked', () => {
    toggleMode.mockClear();
    const { getByLabelText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Switch to dark mode'));
    expect(toggleMode).toHaveBeenCalledTimes(1);
  });

  it('toggles the mobile sidebar when the hamburger is clicked', () => {
    toggleMobileSidebar.mockClear();
    const { getByLabelText } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Open menu'));
    expect(toggleMobileSidebar).toHaveBeenCalledTimes(1);
  });

  it('renders the SettingsDropdown', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <LaikaHeader {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByTestId('settings-dropdown')).toBeInTheDocument();
  });
});

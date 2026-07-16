import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const setMode = vi.fn();

vi.mock('../LaikaThemeContext', () => ({
  useLaikaTheme: () => ({
    mode: 'light' as const,
    setMode,
    toggleMode: vi.fn(),
    resolvedMode: 'light' as const,
  }),
}));

vi.mock('../../core/hooks/useRedux', () => {
  const state = {
    config: {
      site_name: 'Demo Site',
      backend: { name: 'github', repo: 'me/site', branch: 'main' },
      publish_mode: 'editorial_workflow',
    },
  };
  return {
    useAppDispatch: () => () => undefined,
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

import LaikaSettingsPage from '@/laika-app/LaikaSettingsPage';

describe('LaikaSettingsPage', () => {
  it('renders backend config rows', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaSettingsPage />
      </MemoryRouter>,
    );
    expect(getByText('Demo Site')).toBeInTheDocument();
    expect(getByText('github')).toBeInTheDocument();
    expect(getByText('me/site')).toBeInTheDocument();
    expect(getByText('main')).toBeInTheDocument();
    expect(getByText('editorial_workflow')).toBeInTheDocument();
  });

  it('renders the system-theme toggle plus explicit Light/Dark buttons', () => {
    const { getByLabelText, getByText } = render(
      <MemoryRouter>
        <LaikaSettingsPage />
      </MemoryRouter>,
    );
    // Mocked mode is 'light' → toggle off → Light/Dark buttons visible.
    expect(getByLabelText('Match system theme')).toBeInTheDocument();
    expect(getByText('Light')).toBeInTheDocument();
    expect(getByText('Dark')).toBeInTheDocument();
  });

  it('calls setMode with the picked Light/Dark button', () => {
    setMode.mockClear();
    const { getByText } = render(
      <MemoryRouter>
        <LaikaSettingsPage />
      </MemoryRouter>,
    );
    fireEvent.click(getByText('Dark'));
    expect(setMode).toHaveBeenCalledWith('dark');
  });

  it('toggling the system-theme switch calls setMode("system")', () => {
    setMode.mockClear();
    const { getByLabelText } = render(
      <MemoryRouter>
        <LaikaSettingsPage />
      </MemoryRouter>,
    );
    fireEvent.click(getByLabelText('Match system theme'));
    expect(setMode).toHaveBeenCalledWith('system');
  });
});

import React from 'react';
import { render } from '@testing-library/react';
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
  });
});

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import LaikaNotFoundPage from '@/laika-app/LaikaNotFoundPage';

describe('LaikaNotFoundPage', () => {
  it('shows the 404 mark + title + back-to-dashboard CTA', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaNotFoundPage />
      </MemoryRouter>,
    );
    expect(getByText('404')).toBeInTheDocument();
    expect(getByText('app.notFoundPage.header')).toBeInTheDocument();
    const back = getByText('Back to dashboard');
    expect(back.closest('a')?.getAttribute('href')).toBe('/');
  });
});

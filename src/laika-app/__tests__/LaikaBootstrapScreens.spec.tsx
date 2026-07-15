import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import { LaikaConfigLoading, LaikaConfigError } from '@/laika-app/LaikaBootstrapScreens';

describe('LaikaConfigLoading', () => {
  it('shows the i18n loading title and a spinner', () => {
    const { getByText, getByRole } = render(<LaikaConfigLoading />);
    expect(getByText('app.app.loadingConfig')).toBeInTheDocument();
    expect(getByRole('status')).toBeInTheDocument();
  });
});

describe('LaikaConfigError', () => {
  it('renders the error mark, headline, error block, and Retry button', () => {
    const { getByText } = render(<LaikaConfigError error="missing collections" />);
    expect(getByText('!')).toBeInTheDocument();
    expect(getByText('app.app.errorHeader')).toBeInTheDocument();
    expect(getByText('missing collections')).toBeInTheDocument();
    expect(getByText('Retry')).toBeInTheDocument();
  });
});

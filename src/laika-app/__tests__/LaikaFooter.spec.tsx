import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../core/hooks/useRedux', () => {
  const state = { config: { site_name: 'Demo Site' } };
  return {
    useAppDispatch: () => () => undefined,
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

import LaikaFooter from '@/laika-app/LaikaFooter';

describe('LaikaFooter', () => {
  it('renders the site name and the laika label', () => {
    const { getByText } = render(<LaikaFooter />);
    expect(getByText('Demo Site')).toBeInTheDocument();
    expect(getByText('laika-cms-app')).toBeInTheDocument();
  });

  it('renders the package version when DECAP_CMS_APP_VERSION is set', () => {
    (window as { DECAP_CMS_APP_VERSION?: string }).DECAP_CMS_APP_VERSION = '4.0.0-test';
    const { getByText } = render(<LaikaFooter />);
    expect(getByText(/4\.0\.0-test/)).toBeInTheDocument();
    delete (window as { DECAP_CMS_APP_VERSION?: string }).DECAP_CMS_APP_VERSION;
  });
});

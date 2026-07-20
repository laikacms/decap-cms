import { render } from '@testing-library/react';
import React from 'react';
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
});

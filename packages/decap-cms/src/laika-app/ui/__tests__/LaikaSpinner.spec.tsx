import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LaikaSpinner from '@/laika-app/ui/LaikaSpinner';

describe('LaikaSpinner', () => {
  it('renders with role="status" and an accessible label', () => {
    const { getByRole } = render(<LaikaSpinner />);
    const spinner = getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
  });

  it('honors the label override', () => {
    const { getByRole } = render(<LaikaSpinner label="Fetching collections…" />);
    expect(getByRole('status').getAttribute('aria-label')).toBe('Fetching collections…');
  });

  it('accepts each size variant without error', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach(size => {
      const { getByRole, unmount } = render(<LaikaSpinner size={size} />);
      expect(getByRole('status')).toBeInTheDocument();
      unmount();
    });
  });
});

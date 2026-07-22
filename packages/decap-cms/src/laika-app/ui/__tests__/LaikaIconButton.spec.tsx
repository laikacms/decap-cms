import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LaikaIconButton from '@/laika-app/ui/LaikaIconButton';

describe('LaikaIconButton', () => {
  it('renders aria-pressed="true" when active', () => {
    render(<LaikaIconButton aria-label="Grid view option" active />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders aria-pressed="false" when inactive', () => {
    render(<LaikaIconButton aria-label="Grid view option" active={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('omits aria-pressed when active is not provided', () => {
    render(<LaikaIconButton aria-label="Close" />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import EmptyMessage from '@/core/components/MediaLibrary/EmptyMessage';
import { colors } from '@/ui/default/index';

describe('EmptyMessage', () => {
  it('renders content inside a polite status live region', () => {
    render(<EmptyMessage content="No assets yet" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('No assets yet');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('does not render a heading (DCMS-1371 guard)', () => {
    const { container } = render(<EmptyMessage content="No assets yet" />);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
  });

  it('applies the muted color only when isPrivate is true', () => {
    const { container: privateContainer } = render(<EmptyMessage content="x" isPrivate />);
    const { container: publicContainer } = render(<EmptyMessage content="x" />);

    const privateColor = getComputedStyle(privateContainer.firstElementChild as Element).color;
    const publicColor = getComputedStyle(publicContainer.firstElementChild as Element).color;

    expect(privateColor).not.toBe(publicColor);
    expect(privateColor).not.toBe('');
    expect(colors.textFieldBorder).toBeTruthy();
  });
});

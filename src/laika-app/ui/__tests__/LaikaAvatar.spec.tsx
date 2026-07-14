import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LaikaAvatar from '@/laika-app/ui/LaikaAvatar';

describe('LaikaAvatar', () => {
  it('falls back to the first letter of name when no src is supplied', () => {
    const { getByText } = render(<LaikaAvatar name="Alice" />);
    expect(getByText('A')).toBeInTheDocument();
  });

  it('falls back to ? when neither name nor src is supplied', () => {
    const { getByText } = render(<LaikaAvatar />);
    expect(getByText('?')).toBeInTheDocument();
  });

  it('renders the image when src is provided', () => {
    const { getByRole } = render(<LaikaAvatar name="Alice" src="https://example.test/a.png" />);
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('https://example.test/a.png');
    expect(img.alt).toBe('Alice');
  });

  it('falls back to initial when the image errors out', () => {
    const { getByRole, getByText } = render(
      <LaikaAvatar name="Alice" src="https://example.test/missing.png" />,
    );
    const img = getByRole('img');
    fireEvent.error(img);
    expect(getByText('A')).toBeInTheDocument();
  });
});

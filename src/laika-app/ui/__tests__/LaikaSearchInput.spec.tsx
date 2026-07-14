import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LaikaSearchInput from '@/laika-app/ui/LaikaSearchInput';

describe('LaikaSearchInput', () => {
  it('renders a type="search" input', () => {
    const { getByPlaceholderText } = render(<LaikaSearchInput placeholder="Search collections" />);
    const input = getByPlaceholderText('Search collections') as HTMLInputElement;
    expect(input.type).toBe('search');
  });

  it('fires onChange and reports the value', () => {
    const onChange = vi.fn();
    const { getByPlaceholderText } = render(
      <LaikaSearchInput placeholder="Search" onChange={onChange} />,
    );
    fireEvent.change(getByPlaceholderText('Search'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('forwards arbitrary input attributes', () => {
    const { getByLabelText } = render(<LaikaSearchInput aria-label="search the things" disabled />);
    const input = getByLabelText('search the things') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

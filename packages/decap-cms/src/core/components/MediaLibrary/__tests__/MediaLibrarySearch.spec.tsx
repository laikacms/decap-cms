import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibrarySearch from '@/core/components/MediaLibrary/MediaLibrarySearch';

function setup(props: Partial<React.ComponentProps<typeof MediaLibrarySearch>> = {}) {
  const onChange = vi.fn();
  const onKeyDown = vi.fn();
  render(
    <MediaLibrarySearch
      value="cats"
      placeholder="Search..."
      onChange={onChange}
      onKeyDown={onKeyDown}
      {...props}
    />,
  );
  return { input: screen.getByRole('textbox') as HTMLInputElement, onChange, onKeyDown };
}

describe('MediaLibrarySearch', () => {
  it('renders the input with the given value and placeholder', () => {
    const { input } = setup();
    expect(input.value).toBe('cats');
    expect(input.placeholder).toBe('Search...');
  });

  it('disables the input when disabled is true', () => {
    const { input } = setup({ disabled: true });
    expect(input.disabled).toBe(true);
  });

  it('leaves the input enabled when disabled is omitted', () => {
    const { input } = setup();
    expect(input.disabled).toBe(false);
  });

  it('fires onChange with the change event when typing', () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: 'dogs' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target).toBe(input);
  });

  it('fires onKeyDown with the keyboard event on Enter', () => {
    const { input, onKeyDown } = setup();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyDown.mock.calls[0][0].key).toBe('Enter');
  });
});

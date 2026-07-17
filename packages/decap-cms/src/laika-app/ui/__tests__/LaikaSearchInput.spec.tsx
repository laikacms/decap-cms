import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import LaikaSearchInput, { LaikaSearchTrigger } from '@/laika-app/ui/LaikaSearchInput';

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

describe('LaikaSearchTrigger', () => {
  it('renders a non-submitting button with the label and shortcut chip', () => {
    const { getByRole, getByText } = render(
      <LaikaSearchTrigger label="Search all collections" shortcut="⌘K" />,
    );
    const button = getByRole('button', { name: 'Search all collections' }) as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(getByText('⌘K')).toBeInTheDocument();
  });

  it('fires onClick when the field is clicked', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<LaikaSearchTrigger label="Search" onClick={onClick} />);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits the shortcut chip when none is given', () => {
    const { queryByText, getByRole } = render(<LaikaSearchTrigger label="Search" />);
    expect(getByRole('button')).toBeInTheDocument();
    expect(queryByText('⌘K')).toBeNull();
  });
});

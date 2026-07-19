import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MediaLibrarySearch from '../MediaLibrarySearch';

describe('MediaLibrarySearch', () => {
  const baseProps = {
    value: '',
    onChange: jest.fn(),
    onKeyDown: jest.fn(),
    placeholder: 'Search...',
    disabled: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current value in the input', () => {
    const { getByPlaceholderText } = render(<MediaLibrarySearch {...baseProps} value="cats" />);

    expect(getByPlaceholderText('Search...')).toHaveValue('cats');
  });

  it('calls onChange when the input value changes', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <MediaLibrarySearch {...baseProps} onChange={onChange} />,
    );

    fireEvent.change(getByPlaceholderText('Search...'), { target: { value: 'dogs' } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyDown when a key is pressed in the input', () => {
    const onKeyDown = jest.fn();
    const { getByPlaceholderText } = render(
      <MediaLibrarySearch {...baseProps} onKeyDown={onKeyDown} />,
    );

    fireEvent.keyDown(getByPlaceholderText('Search...'), { key: 'Enter', code: 'Enter' });

    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('renders the search icon', () => {
    const { container } = render(<MediaLibrarySearch {...baseProps} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the placeholder text', () => {
    const { getByPlaceholderText } = render(
      <MediaLibrarySearch {...baseProps} placeholder="Find a file" />,
    );

    expect(getByPlaceholderText('Find a file')).toBeInTheDocument();
  });

  it('is not disabled by default', () => {
    const { getByPlaceholderText } = render(<MediaLibrarySearch {...baseProps} />);

    expect(getByPlaceholderText('Search...')).not.toBeDisabled();
  });

  it('disables the input when disabled is true', () => {
    const { getByPlaceholderText } = render(<MediaLibrarySearch {...baseProps} disabled />);

    expect(getByPlaceholderText('Search...')).toBeDisabled();
  });

  it('blocks user input when disabled', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <MediaLibrarySearch {...baseProps} onChange={onChange} disabled />,
    );

    const input = getByPlaceholderText('Search...');

    await userEvent.type(input, 'blocked');

    expect(onChange).not.toHaveBeenCalled();
  });
});

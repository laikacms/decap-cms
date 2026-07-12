import React from 'react';
import { render } from '@testing-library/react';
import { List } from 'immutable';

import SelectPreview from '../SelectPreview';

describe('SelectPreview', () => {
  it('renders one li per item when value is an Immutable List (multi-select)', () => {
    const value = List(['foo', 'bar', 'baz']);
    const { container } = render(<SelectPreview value={value} />);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('foo');
    expect(items[1].textContent).toBe('bar');
    expect(items[2].textContent).toBe('baz');
  });

  it('renders the raw value when value is a string (single-select)', () => {
    const { container } = render(<SelectPreview value="foo" />);

    expect(container.querySelectorAll('li')).toHaveLength(0);
    expect(container.textContent).toBe('foo');
  });

  it('renders nothing extra when value is undefined', () => {
    const { container } = render(<SelectPreview value={undefined} />);

    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('renders nothing extra when value is null', () => {
    const { container } = render(<SelectPreview value={null} />);

    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('renders nothing extra when value is an empty string', () => {
    const { container } = render(<SelectPreview value="" />);

    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

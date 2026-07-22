/**
 * Unit tests for the select widget's SelectPreview component (DCMS-1367).
 *
 * SelectPreview had zero test coverage. These tests lock down its three
 * branches: a scalar value renders the selected option label directly, a
 * falsy value renders nothing, and an array value (multi-select) renders
 * one list item per selected option.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import SelectPreview from '@/widgets/select/SelectPreview';

describe('SelectPreview (select)', () => {
  it('renders the selected option label for a scalar value', () => {
    const { container } = render(React.createElement(SelectPreview, { value: 'Option A' }));

    expect(container.textContent).toBe('Option A');
    expect(container.querySelectorAll('ul')).toHaveLength(0);
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(React.createElement(SelectPreview, { value: undefined }));

    expect(container.textContent).toBe('');
  });

  it('renders nothing when value is an empty string', () => {
    const { container } = render(React.createElement(SelectPreview, { value: '' }));

    expect(container.textContent).toBe('');
  });

  it('renders one list item per selected option for a multi-select array value', () => {
    const value = ['Option A', 'Option B', 'Option C'];

    const { container } = render(React.createElement(SelectPreview, { value }));

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(value.length);
    value.forEach((label, index) => {
      expect(items[index].textContent).toBe(label);
    });
  });

  it('renders an empty list for an empty array value', () => {
    const { container } = render(React.createElement(SelectPreview, { value: [] }));

    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

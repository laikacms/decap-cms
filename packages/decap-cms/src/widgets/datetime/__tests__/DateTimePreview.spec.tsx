/**
 * Unit tests for the datetime widget's DateTimePreview component (DCMS-1367).
 *
 * DateTimePreview had zero test coverage. These tests lock down its
 * behavior: a string value is rendered via `toString()`, and a
 * falsy/undefined value renders nothing.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import DateTimePreview from '@/widgets/datetime/DateTimePreview';

describe('DateTimePreview (datetime)', () => {
  it('renders a formatted date/time string value', () => {
    const { container } = render(
      React.createElement(DateTimePreview, { value: '2026-07-22T10:00:00.000Z' }),
    );

    expect(container.textContent).toBe('2026-07-22T10:00:00.000Z');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(React.createElement(DateTimePreview, { value: undefined }));

    expect(container.textContent).toBe('');
  });

  it('renders nothing when value is an empty string', () => {
    const { container } = render(React.createElement(DateTimePreview, { value: '' }));

    expect(container.textContent).toBe('');
  });

  it('renders the stringified form of a non-string value', () => {
    const value = { toString: () => 'custom-datetime-string' };

    const { container } = render(React.createElement(DateTimePreview, { value }));

    expect(container.textContent).toBe('custom-datetime-string');
  });
});

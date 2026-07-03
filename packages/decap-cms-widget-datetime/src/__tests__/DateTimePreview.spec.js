import React from 'react';
import { render } from '@testing-library/react';

import DatePreview from '../DateTimePreview';

describe('DateTimePreview', () => {
  test('renders the raw value when no field is provided', () => {
    const { container } = render(<DatePreview value="2024-03-15T10:30:00.000Z" />);
    expect(container).toHaveTextContent('2024-03-15T10:30:00.000Z');
  });

  test('renders the raw value when the field has no format options configured', () => {
    const field = new Map();
    const { container } = render(<DatePreview value="2024-03-15T10:30:00.000Z" field={field} />);
    expect(container).toHaveTextContent('2024-03-15T10:30:00.000Z');
  });

  test('renders nothing when value is empty', () => {
    const field = new Map([['date_format', 'DD/MM/YYYY']]);
    const { container } = render(<DatePreview value="" field={field} />);
    expect(container).toHaveTextContent('');
  });

  // All format-related tests use picker_utc so results are deterministic
  // regardless of the timezone the test runner executes in.

  test('formats the value using date_format instead of showing the raw ISO string', () => {
    const field = new Map([
      ['date_format', 'DD/MM/YYYY'],
      ['picker_utc', true],
    ]);
    const { container } = render(<DatePreview value="2024-03-15T10:30:00.000Z" field={field} />);
    expect(container).toHaveTextContent('15/03/2024');
    expect(container).not.toHaveTextContent('2024-03-15T10:30:00.000Z');
  });

  test('formats the value using time_format', () => {
    const field = new Map([
      ['time_format', 'HH:mm'],
      ['picker_utc', true],
    ]);
    const { container } = render(<DatePreview value="2024-03-15T10:30:00.000Z" field={field} />);
    expect(container).toHaveTextContent(/^10:30$/);
  });

  test('formats the value using date_format and time_format together', () => {
    const field = new Map([
      ['date_format', 'DD/MM/YYYY'],
      ['time_format', 'HH:mm'],
      ['picker_utc', true],
    ]);
    const { container } = render(<DatePreview value="2024-03-15T10:30:00.000Z" field={field} />);
    expect(container).toHaveTextContent('15/03/2024T10:30');
  });

  test('falls back to the raw value when the configured value cannot be parsed', () => {
    const field = new Map([['date_format', 'DD/MM/YYYY']]);
    const { container } = render(<DatePreview value="not-a-date" field={field} />);
    expect(container).toHaveTextContent('not-a-date');
  });
});

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

  // DCMS-380: when a custom `format` is configured, values are saved to the
  // content file in that format (e.g. "15/03/2024 at 09:05"), not ISO-8601.
  // A bare `dayjs.utc(value)` (no format) cannot parse this string at all, so
  // the preview must retry with the field's configured format, the same way
  // DateTimeControl.formatInputValue does, instead of silently falling back
  // to the raw saved string.
  //
  // The format re-renders without zero-padding (`D/M/YYYY H:mm`), so the
  // expected output ("15/3/2024 at 9:05") differs from the padded raw input
  // ("15/03/2024 at 09:05") -- this only matches if the value was actually
  // parsed and re-formatted, not merely echoed back as a fallback.
  test('formats a value saved with a custom format instead of falling back to the raw string', () => {
    const field = new Map([
      ['format', 'D/M/YYYY [at] H:mm'],
      ['picker_utc', true],
    ]);
    const { container } = render(<DatePreview value="15/03/2024 at 09:05" field={field} />);
    expect(container).toHaveTextContent('15/3/2024 at 9:05');
    expect(container).not.toHaveTextContent('15/03/2024 at 09:05');
  });

  test('formats a value saved with a custom format using non-slash separators', () => {
    const field = new Map([
      ['format', 'D.M.YYYY [at] H:mm'],
      ['picker_utc', true],
    ]);
    const { container } = render(<DatePreview value="25.12.2024 at 09:05" field={field} />);
    expect(container).toHaveTextContent('25.12.2024 at 9:05');
  });
});

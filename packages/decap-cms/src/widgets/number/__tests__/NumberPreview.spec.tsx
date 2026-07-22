/**
 * Unit tests for the number widget's NumberPreview component (DCMS-1366).
 *
 * NumberPreview had zero test coverage. These tests lock down its rendering:
 * an undefined value renders an empty container, a numeric value renders
 * verbatim (no formatting is applied), and a string value (as stored for
 * out-of-range/overflow cases, see NumberControl) also renders verbatim.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import NumberPreview from '@/widgets/number/NumberPreview';

describe('NumberPreview (number)', () => {
  it('renders an empty container when value is undefined', () => {
    const { container } = render(React.createElement(NumberPreview, { value: undefined }));

    expect(container.firstElementChild).not.toBeNull();
    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('renders an empty container when value is an empty string', () => {
    const { container } = render(React.createElement(NumberPreview, { value: '' }));

    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('renders an integer value verbatim', () => {
    const { container } = render(React.createElement(NumberPreview, { value: 42 }));

    expect(container.textContent).toBe('42');
  });

  it('renders a float value verbatim without additional formatting', () => {
    const { container } = render(React.createElement(NumberPreview, { value: 3.14159 }));

    expect(container.textContent).toBe('3.14159');
  });

  it('renders a negative value verbatim', () => {
    const { container } = render(React.createElement(NumberPreview, { value: -7 }));

    expect(container.textContent).toBe('-7');
  });

  it('renders zero verbatim rather than falling back to empty', () => {
    const { container } = render(React.createElement(NumberPreview, { value: 0 }));

    expect(container.textContent).toBe('0');
  });

  it('renders a raw string value verbatim (e.g. an overflowed/unparsed number)', () => {
    const { container } = render(React.createElement(NumberPreview, { value: '1e309' }));

    expect(container.textContent).toBe('1e309');
  });
});

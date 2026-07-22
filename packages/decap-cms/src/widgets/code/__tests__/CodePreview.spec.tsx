/**
 * Unit tests for the code widget's CodePreview component (DCMS-1374).
 *
 * CodePreview had zero test coverage. These tests lock down its `toValue`
 * branches: a plain string value passes through unchanged, an object value
 * is unwrapped via the field's `keys.code` accessor (defaulting to `code`),
 * and a missing/undefined value renders as an empty string.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import CodePreview from '@/widgets/code/CodePreview';

describe('CodePreview (code)', () => {
  it('renders a string value unchanged', () => {
    const { container } = render(<CodePreview value="console.log('hi');" />);
    expect(container.querySelector('code')?.textContent).toBe("console.log('hi');");
  });

  it('renders an object value using the field-configured code key', () => {
    const value = { body: 'const x = 1;', lang: 'js' };
    const field = { keys: { code: 'body' } };

    const { container } = render(<CodePreview value={value} field={field} />);

    expect(container.querySelector('code')?.textContent).toBe('const x = 1;');
  });

  it('defaults to the "code" key when field has no keys.code override', () => {
    const value = { code: 'const y = 2;' };
    const field = {};

    const { container } = render(<CodePreview value={value} field={field} />);

    expect(container.querySelector('code')?.textContent).toBe('const y = 2;');
  });

  it('renders an empty string when value is undefined', () => {
    const { container } = render(<CodePreview value={undefined} />);
    expect(container.querySelector('code')?.textContent).toBe('');
  });

  it('renders an empty string when value is an object but no field is provided', () => {
    const { container } = render(<CodePreview value={{ code: 'unused' }} />);
    expect(container.querySelector('code')?.textContent).toBe('');
  });
});

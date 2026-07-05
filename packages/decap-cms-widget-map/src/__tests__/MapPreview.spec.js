import React from 'react';
import { render } from '@testing-library/react';

import MapPreview from '../MapPreview';

describe('MapPreview', () => {
  it('renders the toString() of the given value inside the preview container', () => {
    const value = {
      toString: () => 'POINT (1 2)',
    };
    const { container } = render(<MapPreview value={value} />);
    expect(container.textContent).toBe('POINT (1 2)');
  });

  it('renders the value as-is inside the preview container when it is a string', () => {
    const { container } = render(<MapPreview value="POINT (1 2)" />);
    expect(container.textContent).toBe('POINT (1 2)');
  });

  it('renders nothing and does not throw when value is undefined', () => {
    const { container } = render(<MapPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing and does not throw when value is an empty string', () => {
    const { container } = render(<MapPreview value="" />);
    expect(container.textContent).toBe('');
  });
});

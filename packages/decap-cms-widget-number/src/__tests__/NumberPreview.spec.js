import React from 'react';
import { render } from '@testing-library/react';

import NumberPreview from '../NumberPreview';

describe('NumberPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<NumberPreview value={42} />);
    expect(container.textContent).toBe('42');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<NumberPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });
});

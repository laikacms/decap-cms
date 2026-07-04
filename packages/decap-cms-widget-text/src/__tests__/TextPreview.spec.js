import React from 'react';
import { render } from '@testing-library/react';

import TextPreview from '../TextPreview';

describe('TextPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<TextPreview value="Hello World" />);
    expect(container.textContent).toBe('Hello World');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<TextPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing when value is an empty string', () => {
    const { container } = render(<TextPreview value="" />);
    expect(container.textContent).toBe('');
  });
});

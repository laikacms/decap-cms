import React from 'react';
import { render } from '@testing-library/react';

import ColorPreview from '../ColorPreview';

describe('ColorPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<ColorPreview value="#ff0000" />);
    expect(container.textContent).toBe('#ff0000');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<ColorPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });
});

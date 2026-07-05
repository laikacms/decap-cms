import React from 'react';
import { render } from '@testing-library/react';

import RelationPreview from '../RelationPreview';

describe('RelationPreview', () => {
  it('renders the given value inside the preview container', () => {
    const { container } = render(<RelationPreview value="Related Item" />);
    expect(container.textContent).toBe('Related Item');
  });

  it('renders nothing when value is undefined', () => {
    const { container } = render(<RelationPreview value={undefined} />);
    expect(container.textContent).toBe('');
  });
});

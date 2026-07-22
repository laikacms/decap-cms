/**
 * Unit tests for the colorstring widget's ColorPreview component (DCMS-1374).
 *
 * ColorPreview had zero test coverage. These tests confirm the passed value
 * is rendered inside the WidgetPreviewContainer, and that the container
 * renders empty when value is undefined.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import ColorPreview from '@/widgets/colorstring/ColorPreview';

describe('ColorPreview (colorstring)', () => {
  it('renders the passed value inside the widget preview container', () => {
    const { container } = render(<ColorPreview value="#ff0000" />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.textContent).toBe('#ff0000');
  });

  it('renders empty when value is undefined', () => {
    const { container } = render(<ColorPreview value={undefined} />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.textContent).toBe('');
  });
});

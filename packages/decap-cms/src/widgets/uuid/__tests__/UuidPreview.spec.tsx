import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import UuidPreview from '@/widgets/uuid/UuidPreview';

vi.mock('@/ui/default/index', () => ({
  WidgetPreviewContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="widget-preview-container">{children}</div>
  ),
}));

describe('UuidPreview', () => {
  it('renders the value inside the widget preview container', () => {
    render(<UuidPreview value="00000000-0000-4000-8000-000000000000" />);

    expect(screen.getByTestId('widget-preview-container')).toHaveTextContent(
      '00000000-0000-4000-8000-000000000000',
    );
  });

  it('renders an empty widget preview container when the value is undefined', () => {
    render(<UuidPreview value={undefined} />);

    expect(screen.getByTestId('widget-preview-container')).toBeEmptyDOMElement();
  });
});

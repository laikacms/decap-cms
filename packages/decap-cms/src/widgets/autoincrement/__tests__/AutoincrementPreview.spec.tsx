import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AutoincrementPreview from '@/widgets/autoincrement/AutoincrementPreview';

vi.mock('@/ui/default/index', () => ({
  WidgetPreviewContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="widget-preview-container">{children}</div>
  ),
}));

describe('AutoincrementPreview', () => {
  it('renders the value inside the widget preview container', () => {
    render(<AutoincrementPreview value={42} />);

    expect(screen.getByTestId('widget-preview-container')).toHaveTextContent('42');
  });

  it('renders an empty widget preview container when the value is undefined', () => {
    render(<AutoincrementPreview value={undefined} />);

    expect(screen.getByTestId('widget-preview-container')).toBeEmptyDOMElement();
  });
});

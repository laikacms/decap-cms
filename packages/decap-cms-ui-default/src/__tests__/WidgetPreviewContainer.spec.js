import React from 'react';
import { render } from '@testing-library/react';
import { matchers } from '@emotion/jest';

import WidgetPreviewContainer from '../WidgetPreviewContainer';

expect.extend(matchers);

// DCMS-1289: same wrap defect as the preview iframe (see EditorPreviewPane
// and EditorPreview) — a long unbroken token rendered inside a widget's own
// preview container has no natural break point, so it must wrap rather than
// overflow. Mirrors the fix landed on v4.beta in PR #982.
describe('WidgetPreviewContainer wrap CSS (DCMS-1289)', () => {
  it('wraps long unbroken content instead of letting it overflow', () => {
    const { getByText } = render(<WidgetPreviewContainer>content</WidgetPreviewContainer>);

    const container = getByText('content');

    expect(container).toHaveStyleRule('overflow-wrap', 'anywhere');
    expect(container).toHaveStyleRule('word-break', 'break-word');
    expect(container).toHaveStyleRule('max-width', '100%');
  });
});

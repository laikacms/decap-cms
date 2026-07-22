import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { AiChatPreview } from '@/widgets/aichat/AiChatPreview';

// The chat widget is an editing aid only (see AiChatControl.tsx), so its
// preview intentionally has no visual representation regardless of the
// entry's stored value.
describe('AiChatPreview', () => {
  it('renders nothing for a populated value', () => {
    const { container } = render(<AiChatPreview value="some chat transcript" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty value', () => {
    const { container } = render(<AiChatPreview value={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is exported as the widget default export too', async () => {
    const mod = await import('@/widgets/aichat/AiChatPreview');
    expect(mod.default).toBe(AiChatPreview);
  });
});

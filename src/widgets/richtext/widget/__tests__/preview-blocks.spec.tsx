import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { registerBlock, unregisterBlock } from '@/lib/richtext';
import { LexicalPreview } from '@/widgets/richtext/widget/preview';

import type { BlockDefinition } from '@/lib/richtext';

const youtube: BlockDefinition = {
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'id' }],
  preview: ({ data }) => <div data-testid="yt">video:{String(data.id)}</div>,
};

afterEach(() => {
  unregisterBlock('youtube');
});

describe('LexicalPreview custom blocks', () => {
  it('renders a registered block through its preview component', () => {
    registerBlock(youtube);
    render(
      <LexicalPreview
        value={[
          { _type: 'youtube', _key: 'k0', id: 'abc123' },
        ]}
      />,
    );
    expect(screen.getByTestId('yt')).toHaveTextContent('video:abc123');
  });

  it('renders nothing (not a JSON dump) for unknown block types', () => {
    const { container } = render(
      <LexicalPreview value={[{ _type: 'mystery', _key: 'k0', secret: 1 }]} />,
    );
    expect(container.textContent).toBe('');
  });
});

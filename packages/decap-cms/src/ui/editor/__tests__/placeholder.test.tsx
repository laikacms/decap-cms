import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { Editor } from '@/ui/editor/Editor';

registerMapper(markdownMapper);

// DCMS-1433: `field.placeholder` was documented but never wired through to
// the editor's empty-state text, which always showed the hardcoded default.
describe('Editor placeholder prop', () => {
  it('renders the default placeholder when none is supplied', () => {
    render(<Editor format="markdown" />);

    expect(document.body.textContent).toContain('Press / for commands...');
  });

  it('renders a custom placeholder when supplied', () => {
    render(<Editor format="markdown" placeholder="Custom text" />);

    expect(document.body.textContent).toContain('Custom text');
    expect(document.body.textContent).not.toContain('Press / for commands...');
  });
});

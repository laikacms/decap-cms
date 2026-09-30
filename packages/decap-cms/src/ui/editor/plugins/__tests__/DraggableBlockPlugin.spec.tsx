import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DraggableBlockPlugin } from '@/ui/editor/plugins/DraggableBlockPlugin';

import type { ReactNode } from 'react';

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [{ read: vi.fn(), update: vi.fn() }],
}));

vi.mock('@lexical/react/LexicalDraggableBlockPlugin', () => ({
  DraggableBlockPlugin_EXPERIMENTAL: ({ menuComponent }: { menuComponent: ReactNode }) => <>{menuComponent}</>,
}));

vi.mock('@/ui/editor/editor-hooks/useModal', () => ({
  useEditorModal: () => [null, vi.fn()],
}));

describe('DraggableBlockPlugin drag handle', () => {
  it('gives the grip button an accessible name and title', () => {
    render(<DraggableBlockPlugin anchorElem={document.body} />);
    const grip = screen.getByRole('button', { name: 'Drag to move block' });
    expect(grip.getAttribute('title')).toBe('Drag to move block');
  });

  it('leaves no unnamed buttons in the block menu', () => {
    render(<DraggableBlockPlugin anchorElem={document.body} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-label') || button.getAttribute('title')).toBeTruthy();
    }
  });
});

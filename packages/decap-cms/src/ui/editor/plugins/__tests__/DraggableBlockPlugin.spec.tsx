import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';

import { DraggableBlockPlugin } from '@/ui/editor/plugins/DraggableBlockPlugin';


import type { ReactNode } from 'react';

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [{ read: (fn: () => void) => fn(), update: vi.fn() }],
}));

vi.mock('@lexical/react/LexicalDraggableBlockPlugin', () => ({
  DraggableBlockPlugin_EXPERIMENTAL: (
    { menuComponent, onElementChanged }: { menuComponent: ReactNode, onElementChanged: (el: HTMLElement) => void },
  ) => {
    useEffect(() => onElementChanged(document.createElement('p')), [onElementChanged]);
    return <>{menuComponent}</>;
  },
}));

vi.mock('lexical', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  $getNearestNodeFromDOMNode: () => ({ getKey: () => 'node-key' }),
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

describe('DraggableBlockPlugin block filter', () => {
  it('gives the filter input an accessible name', () => {
    render(<DraggableBlockPlugin anchorElem={document.body} />);
    fireEvent.click(screen.getByRole('button', { name: /Click to add below/ }));
    expect(screen.getByRole('combobox', { name: 'Filter blocks' })).toBeTruthy();
  });
});

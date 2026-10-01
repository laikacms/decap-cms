import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/ui/Tooltip';
import { EditModeTogglePlugin } from './EditModeTogglePlugin';

import type { LexicalEditor } from 'lexical';

let editor: LexicalEditor;

function CaptureEditor() {
  [editor] = useLexicalComposerContext();
  return null;
}

function renderPlugin(editable: boolean) {
  render(
    <LexicalComposer initialConfig={{ namespace: 'test', editable, onError: error => { throw error; } }}>
      <TooltipProvider>
        <CaptureEditor />
        <EditModeTogglePlugin />
      </TooltipProvider>
    </LexicalComposer>,
  );
}

describe('EditModeTogglePlugin', () => {
  it('offers to lock an editable editor and reports it as not pressed', () => {
    renderPlugin(true);
    const button = screen.getByRole('button', { name: 'Lock read-only mode' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(editor.isEditable()).toBe(true);
  });

  it('makes the editor read-only on click and reflects it in the label and aria-pressed', () => {
    renderPlugin(true);
    fireEvent.click(screen.getByRole('button', { name: 'Lock read-only mode' }));

    expect(editor.isEditable()).toBe(false);
    const button = screen.getByRole('button', { name: 'Unlock read-only mode' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Lock read-only mode' })).toBeNull();
  });

  it('makes the editor editable again on a second click', () => {
    renderPlugin(true);
    fireEvent.click(screen.getByRole('button', { name: 'Lock read-only mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock read-only mode' }));

    expect(editor.isEditable()).toBe(true);
    expect(screen.getByRole('button', { name: 'Lock read-only mode' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('starts pressed when the editor is initially read-only', () => {
    renderPlugin(false);
    const button = screen.getByRole('button', { name: 'Unlock read-only mode' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(editor.isEditable()).toBe(true);
  });
});

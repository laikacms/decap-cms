import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { sourceToEditorState } from '@/lib/richtext/lexical';
import { Editor } from '@/ui/editor/Editor';

import type { SerializedEditorState } from 'lexical';

registerMapper(markdownMapper);

function editorText(): string {
  return document.querySelector('.ContentEditable__root')?.textContent ?? '';
}

function rootChildren(state: SerializedEditorState): Array<{ type?: string }> {
  return (state as unknown as { root: { children: Array<{ type?: string }> } }).root.children;
}

describe('SourceTogglePlugin', () => {
  it('round-trips rich text -> source -> rich text through the format mapper', async () => {
    const onSerializedChange = vi.fn();
    const initial = sourceToEditorState('# Hello\n\nSome **bold** text', 'markdown');

    render(
      <Editor
        editorSerializedState={initial}
        format="markdown"
        onSerializedChange={onSerializedChange}
      />,
    );

    await waitFor(() => expect(editorText()).toContain('Hello'));
    expect(editorText()).not.toContain('#');

    // To source: the mapper's serialization appears as editable text.
    fireEvent.click(screen.getByRole('button', { name: 'View source (markdown)' }));
    await waitFor(() => expect(editorText()).toContain('# Hello'));
    expect(editorText()).toContain('**bold**');

    // Back to rich text: markdown syntax is gone again.
    fireEvent.click(screen.getByRole('button', { name: 'Back to rich text' }));
    await waitFor(() => expect(editorText()).not.toContain('#'));
    expect(editorText()).toContain('Hello');
    expect(editorText()).toContain('bold');

    // Persist safety: consumers never receive the source-view shell (a
    // single code node); every update carries real, re-parsed content.
    for (const call of onSerializedChange.mock.calls) {
      const children = rootChildren(call[0] as SerializedEditorState);
      expect(children.map(child => child.type)).not.toEqual(['code']);
    }
  });

  it('keeps custom blocks through the source round-trip', async () => {
    const initial = sourceToEditorState('intro', 'markdown');
    rootChildren(initial).push({
      type: 'decap-block',
      version: 1,
      componentId: 'youtube',
      data: { url: 'https://youtu.be/x' },
    } as unknown as { type?: string });

    render(<Editor editorSerializedState={initial} format="markdown" />);
    await waitFor(() => expect(editorText()).toContain('intro'));

    fireEvent.click(screen.getByRole('button', { name: 'View source (markdown)' }));
    // The markdown mapper's fallback encoding for a custom block is a JSON
    // fence; the block's data stays visible and editable in the source.
    await waitFor(() => expect(editorText()).toContain('"_type": "youtube"'));
    expect(editorText()).toContain('https://youtu.be/x');
  });
});

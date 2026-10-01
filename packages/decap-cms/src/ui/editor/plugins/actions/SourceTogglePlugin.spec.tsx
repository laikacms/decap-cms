import { $isCodeNode } from '@lexical/code';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $getRoot } from 'lexical';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { DEFAULT_NODES, editorStateToSource, sourceToEditorState } from '@/lib/richtext/lexical';
import { SourceTogglePlugin } from './SourceTogglePlugin';

import type { LexicalEditor } from 'lexical';

registerMapper(markdownMapper);

const DOC = '# Hello\n\nSome **bold** text';

let editor: LexicalEditor;

function CaptureEditor() {
  [editor] = useLexicalComposerContext();
  return null;
}

function Harness({ format }: { format: string }) {
  const [isSourceView, setIsSourceView] = useState(false);
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'test',
        nodes: [...DEFAULT_NODES],
        editorState: editor => editor.setEditorState(editor.parseEditorState(sourceToEditorState(DOC, 'markdown'))),
        onError: error => { throw error; },
      }}
    >
      <CaptureEditor />
      <SourceTogglePlugin format={format} isSourceView={isSourceView} onSourceViewChange={setIsSourceView} />
    </LexicalComposer>
  );
}

function inSourceView() {
  return editor.getEditorState().read(() => {
    const first = $getRoot().getFirstChild();
    return $isCodeNode(first) && $getRoot().getChildrenSize() === 1;
  });
}

describe('SourceTogglePlugin', () => {
  it('renders nothing when no mapper is registered for the format', () => {
    render(<Harness format="no-such-format" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('starts unpressed with a view-source label', () => {
    render(<Harness format="markdown" />);
    expect(screen.getByRole('button', { name: 'View source (markdown)' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the mapper source in a single code node and flips the label and aria-pressed', async () => {
    render(<Harness format="markdown" />);
    const expectedSource = editorStateToSource(editor.getEditorState().toJSON(), 'markdown');

    fireEvent.click(screen.getByRole('button', { name: 'View source (markdown)' }));

    await waitFor(() => expect(inSourceView()).toBe(true));
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe(expectedSource);
    expect(screen.getByRole('button', { name: 'Back to rich text' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('round-trips the document without loss when toggled back to rich text', async () => {
    render(<Harness format="markdown" />);
    const before = editorStateToSource(editor.getEditorState().toJSON(), 'markdown');

    fireEvent.click(screen.getByRole('button', { name: 'View source (markdown)' }));
    await waitFor(() => expect(inSourceView()).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Back to rich text' }));
    await waitFor(() => expect(inSourceView()).toBe(false));

    expect(editorStateToSource(editor.getEditorState().toJSON(), 'markdown')).toBe(before);
    expect(screen.getByRole('button', { name: 'View source (markdown)' }).getAttribute('aria-pressed')).toBe('false');
  });
});

import { $isCodeNode, CodeNode } from '@lexical/code';
import { TRANSFORMERS } from '@lexical/markdown';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode } from '@lexical/rich-text';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { MarkdownTogglePlugin } from './MarkdownTogglePlugin';

import type { LexicalEditor } from 'lexical';

let editor: LexicalEditor;

function CaptureEditor() {
  [editor] = useLexicalComposerContext();
  return null;
}

function renderPlugin() {
  render(
    <LexicalComposer
      initialConfig={{ namespace: 'test', nodes: [HeadingNode, CodeNode], onError: error => { throw error; } }}
    >
      <CaptureEditor />
      <MarkdownTogglePlugin shouldPreserveNewLinesInMarkdown={false} transformers={TRANSFORMERS} />
    </LexicalComposer>,
  );
}

function seedParagraph(text: string, boldText?: string) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      if (boldText) {
        paragraph.append($createTextNode(boldText).toggleFormat('bold'));
      }
      $getRoot().clear().append(paragraph);
    },
    { discrete: true },
  );
}

function rootSnapshot() {
  return editor.getEditorState().read(() => {
    const first = $getRoot().getFirstChild();
    return {
      childCount: $getRoot().getChildrenSize(),
      isMarkdownCode: $isCodeNode(first) && first.getLanguage() === 'markdown',
      type: first?.getType(),
      text: $getRoot().getTextContent(),
    };
  });
}

describe('MarkdownTogglePlugin', () => {
  it('exposes a labelled toggle button', () => {
    renderPlugin();
    expect(screen.getByRole('button', { name: 'Convert from markdown' })).toBeTruthy();
  });

  it('converts rich text to a single markdown code block on the first toggle', async () => {
    renderPlugin();
    seedParagraph('hello ', 'world');

    fireEvent.click(screen.getByRole('button', { name: 'Convert from markdown' }));
    await waitFor(() => expect(rootSnapshot().isMarkdownCode).toBe(true));

    const snapshot = rootSnapshot();
    expect(snapshot.childCount).toBe(1);
    expect(snapshot.text).toBe('hello **world**');
  });

  it('parses the markdown code block back into rich nodes on the second toggle', async () => {
    renderPlugin();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('# Title'));
        $getRoot().clear().append(paragraph);
      },
      { discrete: true },
    );

    const button = screen.getByRole('button', { name: 'Convert from markdown' });
    fireEvent.click(button);
    await waitFor(() => expect(rootSnapshot().isMarkdownCode).toBe(true));

    fireEvent.click(button);
    await waitFor(() => expect(rootSnapshot().isMarkdownCode).toBe(false));

    const snapshot = rootSnapshot();
    expect(snapshot.isMarkdownCode).toBe(false);
    expect(snapshot.type).toBe('heading');
    expect(snapshot.text).toBe('Title');
  });

  it('runs exactly one editor update per click', async () => {
    renderPlugin();
    seedParagraph('one');

    let updates = 0;
    const unregister = editor.registerUpdateListener(() => {
      updates += 1;
    });
    fireEvent.click(screen.getByRole('button', { name: 'Convert from markdown' }));
    await waitFor(() => expect(rootSnapshot().isMarkdownCode).toBe(true));
    unregister();

    expect(updates).toBe(1);
  });
});

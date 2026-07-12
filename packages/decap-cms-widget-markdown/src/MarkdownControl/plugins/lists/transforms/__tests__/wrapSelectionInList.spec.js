import { createEditor } from 'slate';

import wrapSelectionInList from '../wrapSelectionInList';

describe('wrapSelectionInList', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  it('wraps the selected paragraphs in a list, each as its own list item', () => {
    const editor = buildEditor(
      [
        { type: 'paragraph', children: [{ text: 'item 1' }] },
        { type: 'paragraph', children: [{ text: 'item 2' }] },
      ],
      {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [1, 0], offset: 6 },
      },
    );

    wrapSelectionInList(editor, 'bulleted-list');

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 2' }] }] },
        ],
      },
    ]);
  });
});

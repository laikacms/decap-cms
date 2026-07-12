import { createEditor } from 'slate';

import unwrapSelectionFromList from '../unwrapSelectionFromList';

describe('unwrapSelectionFromList', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  it('unwraps the selected list items and the list back into plain paragraphs', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
            },
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'item 2' }] }],
            },
          ],
        },
      ],
      {
        anchor: { path: [0, 0, 0, 0], offset: 0 },
        focus: { path: [0, 1, 0, 0], offset: 6 },
      },
    );

    unwrapSelectionFromList(editor);

    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ text: 'item 1' }] },
      { type: 'paragraph', children: [{ text: 'item 2' }] },
    ]);
  });
});

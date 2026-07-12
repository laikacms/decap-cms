import { createEditor } from 'slate';

import changeListType from '../changeListType';

describe('changeListType', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  it('rewraps the selected list items from one list type to another', () => {
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

    changeListType(editor, 'numbered-list');

    expect(editor.children).toEqual([
      {
        type: 'numbered-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 2' }] }] },
        ],
      },
    ]);
  });
});

import { createEditor } from 'slate';

import mergeWithPreviousListItem from '../mergeWithPreviousListItem';

describe('mergeWithPreviousListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('merges the current list item into the previous list item', () => {
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
      pointAt([0, 1, 0, 0], 0),
    );

    mergeWithPreviousListItem(editor);

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          {
            type: 'list-item',
            children: [
              { type: 'paragraph', children: [{ text: 'item 1' }] },
              { type: 'paragraph', children: [{ text: 'item 2' }] },
            ],
          },
        ],
      },
    ]);
  });
});

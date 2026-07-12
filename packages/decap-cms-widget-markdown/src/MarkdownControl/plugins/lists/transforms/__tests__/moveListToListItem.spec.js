import { createEditor } from 'slate';

import moveListToListItem from '../moveListToListItem';

describe('moveListToListItem', () => {
  function buildEditor(children) {
    const editor = createEditor();
    editor.children = children;
    return editor;
  }

  it('moves a sibling list to become the last child of the target list item', () => {
    const editor = buildEditor([
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'target' }] }] },
        ],
      },
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'source' }] }] },
        ],
      },
    ]);
    const targetListItem = editor.children[0].children[0];

    moveListToListItem(editor, [1], [targetListItem, [0, 0]]);

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          {
            type: 'list-item',
            children: [
              { type: 'paragraph', children: [{ text: 'target' }] },
              {
                type: 'bulleted-list',
                children: [
                  {
                    type: 'list-item',
                    children: [{ type: 'paragraph', children: [{ text: 'source' }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});

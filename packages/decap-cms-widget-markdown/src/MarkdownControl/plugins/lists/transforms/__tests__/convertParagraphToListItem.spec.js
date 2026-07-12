import { createEditor } from 'slate';

import convertParagraphToListItem from '../convertParagraphToListItem';

describe('convertParagraphToListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('splits a second paragraph inside a list item into its own sibling list item', () => {
    const editor = buildEditor(
      [
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
      ],
      pointAt([0, 0, 1, 0], 0),
    );

    convertParagraphToListItem(editor);

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

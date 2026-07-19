import { createEditor } from 'slate';

import liftListItem from '../liftListItem';

describe('liftListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('lifts a top-level list item paragraph out of the list entirely', () => {
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

    liftListItem(editor);

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
        ],
      },
      { type: 'paragraph', children: [{ text: 'item 2' }] },
    ]);
  });

  it('lifts a nested list item paragraph up into the parent list instead of unwrapping', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [
                { type: 'paragraph', children: [{ text: 'item 1' }] },
                {
                  type: 'bulleted-list',
                  children: [
                    {
                      type: 'list-item',
                      children: [{ type: 'paragraph', children: [{ text: 'nested' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      pointAt([0, 0, 1, 0, 0, 0], 0),
    );

    liftListItem(editor);

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'nested' }] }] },
        ],
      },
    ]);
  });
});

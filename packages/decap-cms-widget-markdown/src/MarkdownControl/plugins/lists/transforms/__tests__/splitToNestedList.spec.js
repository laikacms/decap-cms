import { createEditor } from 'slate';

import splitToNestedList from '../splitToNestedList';

describe('splitToNestedList', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns false and leaves the document untouched when there is no selection', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'hello world' }] }],
            },
          ],
        },
      ],
      null,
    );

    expect(splitToNestedList(editor, 'bulleted-list')).toBe(false);
    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          {
            type: 'list-item',
            children: [{ type: 'paragraph', children: [{ text: 'hello world' }] }],
          },
        ],
      },
    ]);
  });

  it('splits the text at the cursor into a new list nested inside the current list item', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'hello world' }] }],
            },
          ],
        },
      ],
      pointAt([0, 0, 0, 0], 5),
    );

    splitToNestedList(editor, 'bulleted-list');

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          {
            type: 'list-item',
            children: [
              { type: 'paragraph', children: [{ text: 'hello' }] },
              {
                type: 'bulleted-list',
                children: [
                  {
                    type: 'list-item',
                    children: [{ type: 'paragraph', children: [{ text: ' world' }] }],
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

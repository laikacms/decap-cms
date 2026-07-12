import { createEditor } from 'slate';

import splitListItem from '../splitListItem';

describe('splitListItem', () => {
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

    expect(splitListItem(editor)).toBe(false);
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

  it('splits the list item paragraph at the cursor into a new sibling list item', () => {
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

    splitListItem(editor);

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'hello' }] }] },
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: ' world' }] }] },
        ],
      },
    ]);
  });
});

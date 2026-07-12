import { createEditor } from 'slate';

import getListTypeAtCursor from '../getListTypeAtCursor';

describe('getListTypeAtCursor', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns the list type when the cursor is inside a list', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
            },
          ],
        },
      ],
      pointAt([0, 0, 0, 0], 2),
    );

    expect(getListTypeAtCursor(editor)).toEqual('bulleted-list');
  });

  it('returns null when the cursor is not inside a list', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(getListTypeAtCursor(editor)).toBeNull();
  });
});

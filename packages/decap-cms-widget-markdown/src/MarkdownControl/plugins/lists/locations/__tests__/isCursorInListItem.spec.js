import { createEditor } from 'slate';

import isCursorInListItem from '../isCursorInListItem';

describe('isCursorInListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns true when the cursor is inside a list item paragraph', () => {
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

    expect(isCursorInListItem(editor)).toBe(true);
  });

  it('returns false when the cursor is in a plain paragraph outside of any list', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorInListItem(editor)).toBe(false);
  });

  it('returns false when there is no selection', () => {
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
      null,
    );

    expect(isCursorInListItem(editor)).toBe(false);
  });
});

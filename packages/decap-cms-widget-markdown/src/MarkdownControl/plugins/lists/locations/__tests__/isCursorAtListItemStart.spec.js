import { createEditor } from 'slate';

import isCursorAtListItemStart from '../isCursorAtListItemStart';

describe('isCursorAtListItemStart', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  const listChildren = [
    {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
        },
      ],
    },
  ];

  it('returns true when the cursor is at offset 0 of the first paragraph of a list item', () => {
    const editor = buildEditor(listChildren, pointAt([0, 0, 0, 0], 0));

    expect(isCursorAtListItemStart(editor)).toBe(true);
  });

  it('returns false when the cursor is not at offset 0', () => {
    const editor = buildEditor(listChildren, pointAt([0, 0, 0, 0], 3));

    expect(isCursorAtListItemStart(editor)).toBe(false);
  });

  it('returns false when there is no selection', () => {
    const editor = buildEditor(listChildren, null);

    expect(isCursorAtListItemStart(editor)).toBe(false);
  });
});

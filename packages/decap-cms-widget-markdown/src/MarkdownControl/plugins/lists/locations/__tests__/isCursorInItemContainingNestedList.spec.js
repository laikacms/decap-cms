import { createEditor } from 'slate';

import isCursorInItemContainingNestedList from '../isCursorInItemContainingNestedList';

describe('isCursorInItemContainingNestedList', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns true when the list item paragraph is followed by a nested list', () => {
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
                      children: [{ type: 'paragraph', children: [{ text: 'nested item' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      pointAt([0, 0, 0, 0], 0),
    );

    expect(isCursorInItemContainingNestedList(editor)).toBe(true);
  });

  it('returns false when the list item paragraph has no following nested list', () => {
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
      pointAt([0, 0, 0, 0], 0),
    );

    expect(isCursorInItemContainingNestedList(editor)).toBe(false);
  });
});

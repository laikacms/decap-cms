import { createEditor } from 'slate';

import isSelectionWithinNoninitialListItem from '../isSelectionWithinNoninitialListItem';

describe('isSelectionWithinNoninitialListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  const twoItemList = [
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
  ];

  it('returns true when the selection is within a non-initial list item', () => {
    const editor = buildEditor(twoItemList, pointAt([0, 1, 0, 0], 2));

    expect(isSelectionWithinNoninitialListItem(editor)).toBe(true);
  });

  it('returns a falsy value when the selection is within the initial list item', () => {
    const editor = buildEditor(twoItemList, pointAt([0, 0, 0, 0], 2));

    expect(isSelectionWithinNoninitialListItem(editor)).toBeFalsy();
  });

  it('returns false when there is no selection', () => {
    const editor = buildEditor(twoItemList, null);

    expect(isSelectionWithinNoninitialListItem(editor)).toBe(false);
  });
});

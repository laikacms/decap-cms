import { createEditor } from 'slate';

import getListContainedInListItem from '../getListContainedInListItem';

describe('getListContainedInListItem', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

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

    expect(getListContainedInListItem(editor)).toBe(false);
  });

  it('returns the nested list when the list item paragraph is followed by a nested list', () => {
    const nestedList = {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [{ type: 'paragraph', children: [{ text: 'nested item' }] }],
        },
      ],
    };
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }, nestedList],
            },
          ],
        },
      ],
      pointAt([0, 0, 0, 0], 0),
    );

    const [node, path] = getListContainedInListItem(editor);

    expect(node).toEqual(nestedList);
    expect(path).toEqual([0, 0, 1]);
  });

  it('returns undefined when the list item paragraph has no following nested list', () => {
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

    expect(getListContainedInListItem(editor)).toBeUndefined();
  });
});

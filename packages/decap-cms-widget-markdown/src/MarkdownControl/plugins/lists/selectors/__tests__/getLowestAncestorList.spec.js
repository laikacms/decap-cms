import { createEditor } from 'slate';

import getLowestAncestorList from '../getLowestAncestorList';

describe('getLowestAncestorList', () => {
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

    expect(getLowestAncestorList(editor)).toBe(false);
  });

  it('returns the lowest ancestor list when the selection is inside a list', () => {
    const list = {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
        },
      ],
    };
    const editor = buildEditor([list], pointAt([0, 0, 0, 0], 2));

    const [node, path] = getLowestAncestorList(editor);

    expect(node).toEqual(list);
    expect(path).toEqual([0]);
  });

  it('returns undefined when the selection has no ancestor list', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(getLowestAncestorList(editor)).toBeUndefined();
  });
});

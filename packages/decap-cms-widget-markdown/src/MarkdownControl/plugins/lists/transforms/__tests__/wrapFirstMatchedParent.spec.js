import { createEditor } from 'slate';

import wrapFirstMatchedParent from '../wrapFirstMatchedParent';

describe('wrapFirstMatchedParent', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('wraps the matched paragraph ancestor in the given node', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
      pointAt([0, 0], 0),
    );

    wrapFirstMatchedParent(editor, 'paragraph', { type: 'list-item' });

    expect(editor.children).toEqual([
      { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
    ]);
  });
});

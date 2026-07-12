import { createEditor } from 'slate';

import unwrapFirstMatchedParent from '../unwrapFirstMatchedParent';

describe('unwrapFirstMatchedParent', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('unwraps the list item, leaving its paragraph directly under the list', () => {
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

    unwrapFirstMatchedParent(editor, 'list-item');

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
      },
    ]);
  });
});

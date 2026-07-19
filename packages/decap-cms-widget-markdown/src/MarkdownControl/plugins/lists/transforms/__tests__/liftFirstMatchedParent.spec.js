import { createEditor } from 'slate';

import liftFirstMatchedParent from '../liftFirstMatchedParent';

describe('liftFirstMatchedParent', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('lifts the lowest matching ancestor of the given format out of its parent', () => {
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

    liftFirstMatchedParent(editor, 'list-item');

    expect(editor.children).toEqual([
      { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
    ]);
  });

  it('treats heading types as matching the paragraph format', () => {
    const editor = buildEditor(
      [
        {
          type: 'quote',
          children: [{ type: 'heading-one', children: [{ text: 'title' }] }],
        },
      ],
      pointAt([0, 0, 0], 0),
    );

    liftFirstMatchedParent(editor, 'paragraph');

    expect(editor.children).toEqual([{ type: 'heading-one', children: [{ text: 'title' }] }]);
  });
});

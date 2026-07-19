import { createEditor } from 'slate';

import isCursorInNonDefaultBlock from '../isCursorInNonDefaultBlock';

describe('isCursorInNonDefaultBlock', () => {
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
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'plain text' }] }], null);

    expect(isCursorInNonDefaultBlock(editor)).toBe(false);
  });

  it('returns false when the cursor is inside a plain paragraph', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorInNonDefaultBlock(editor)).toBe(false);
  });

  it('returns true when the cursor is inside a non-paragraph block', () => {
    const editor = buildEditor(
      [
        {
          type: 'code-block',
          children: [{ type: 'code-block-line', children: [{ text: 'const x = 1;' }] }],
        },
      ],
      pointAt([0, 0, 0], 2),
    );

    expect(isCursorInNonDefaultBlock(editor)).toBe(true);
  });
});

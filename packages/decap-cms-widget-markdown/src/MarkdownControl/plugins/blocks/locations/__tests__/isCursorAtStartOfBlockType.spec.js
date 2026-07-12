import { createEditor } from 'slate';

import isCursorAtStartOfBlockType from '../isCursorAtStartOfBlockType';

describe('isCursorAtStartOfBlockType', () => {
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
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'hello' }] }], null);

    expect(isCursorAtStartOfBlockType(editor, 'paragraph')).toBe(false);
  });

  it('returns true when the cursor is at the start of a matching paragraph', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 0),
    );

    expect(isCursorAtStartOfBlockType(editor, 'paragraph')).toBe(true);
  });

  it('returns false when the cursor is not at the start of the matching paragraph', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 3),
    );

    expect(isCursorAtStartOfBlockType(editor, 'paragraph')).toBe(false);
  });
});

import { createEditor } from 'slate';

import isCursorAtEndOfParagraph from '../isCursorAtEndOfParagraph';

describe('isCursorAtEndOfParagraph', () => {
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

    expect(isCursorAtEndOfParagraph(editor)).toBe(false);
  });

  it('returns true when the cursor is at the end of the paragraph text', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 5),
    );

    expect(isCursorAtEndOfParagraph(editor)).toBe(true);
  });

  it('returns false when the cursor is in the middle of the paragraph text', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorAtEndOfParagraph(editor)).toBe(false);
  });
});

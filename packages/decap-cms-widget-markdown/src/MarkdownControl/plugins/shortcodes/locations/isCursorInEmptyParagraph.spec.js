import { createEditor } from 'slate';

import isCursorInEmptyParagraph from './isCursorInEmptyParagraph';

describe('isCursorInEmptyParagraph', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns true when the cursor is in an empty paragraph', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: '' }] }],
      pointAt([0, 0], 0),
    );

    expect(isCursorInEmptyParagraph(editor)).toBe(true);
  });

  it('returns false when the cursor is in a non-empty paragraph', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 5),
    );

    expect(isCursorInEmptyParagraph(editor)).toBe(false);
  });

  it('returns false when there is no selection', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: '' }] }], null);

    expect(isCursorInEmptyParagraph(editor)).toBe(false);
  });

  it('returns false when the cursor is in a non-paragraph block', () => {
    const editor = buildEditor(
      [{ type: 'heading-one', children: [{ text: '' }] }],
      pointAt([0, 0], 0),
    );

    expect(isCursorInEmptyParagraph(editor)).toBe(false);
  });
});

import { createEditor } from 'slate';

import toggleMark from '../toggleMark';

describe('toggleMark', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('adds the mark to the selected text when it is not already active', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    toggleMark(editor, 'bold');

    expect(editor.marks).toEqual({ bold: true });
  });

  it('removes the mark from the selected text when it is already active', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'bold text', bold: true }] }],
      pointAt([0, 0], 2),
    );

    toggleMark(editor, 'bold');

    expect(editor.marks).toEqual({});
  });

  it('only toggles the requested format, independent of other active marks', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'text', bold: true }] }],
      pointAt([0, 0], 2),
    );

    toggleMark(editor, 'italic');

    expect(editor.marks).toEqual({ bold: true, italic: true });
  });
});

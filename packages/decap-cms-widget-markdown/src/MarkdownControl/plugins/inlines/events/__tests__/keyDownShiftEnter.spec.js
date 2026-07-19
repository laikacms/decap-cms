import { createEditor } from 'slate';

import keyDownShiftEnter from '../keyDownShiftEnter';
import withInlines from '../../withInlines';

describe('keyDownShiftEnter', () => {
  // `break` is only void+inline (so it can sit inline in text without splitting the
  // paragraph into blocks) once withInlines has been applied to the editor.
  function buildEditor(children, selection) {
    const editor = withInlines(createEditor());
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('does nothing and returns undefined when there is no selection', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'hello' }] }], null);

    const result = keyDownShiftEnter(editor);

    expect(result).toBeUndefined();
    expect(editor.children).toEqual([{ type: 'paragraph', children: [{ text: 'hello' }] }]);
  });

  it('inserts a break node at the cursor position', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 5),
    );

    keyDownShiftEnter(editor);

    const [paragraph] = editor.children;
    expect(paragraph.children).toContainEqual({ type: 'break', children: [{ text: '' }] });
  });

  it('returns false to signal the key event was handled', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 5),
    );

    expect(keyDownShiftEnter(editor)).toBe(false);
  });

  it('leaves the editor with a valid, non-null selection after inserting the break', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 2),
    );

    keyDownShiftEnter(editor);

    expect(editor.selection).not.toBeNull();
  });
});

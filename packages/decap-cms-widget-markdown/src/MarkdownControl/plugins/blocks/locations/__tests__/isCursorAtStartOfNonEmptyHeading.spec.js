import { createEditor } from 'slate';

import isCursorAtStartOfNonEmptyHeading from '../isCursorAtStartOfNonEmptyHeading';

describe('isCursorAtStartOfNonEmptyHeading', () => {
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
    const editor = buildEditor([{ type: 'heading-two', children: [{ text: 'Title' }] }], null);

    expect(isCursorAtStartOfNonEmptyHeading(editor)).toBe(false);
  });

  it('returns true when the cursor is at the start of a non-empty heading', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 0),
    );

    expect(isCursorAtStartOfNonEmptyHeading(editor)).toBe(true);
  });

  it('returns false when the heading is empty', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: '' }] }],
      pointAt([0, 0], 0),
    );

    expect(isCursorAtStartOfNonEmptyHeading(editor)).toBe(false);
  });

  it('returns false when the cursor is not at the start of the heading', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorAtStartOfNonEmptyHeading(editor)).toBe(false);
  });
});

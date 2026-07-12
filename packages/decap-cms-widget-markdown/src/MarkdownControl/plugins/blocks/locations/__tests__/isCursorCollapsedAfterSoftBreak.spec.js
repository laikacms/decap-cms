import { createEditor } from 'slate';

import isCursorCollapsedAfterSoftBreak from '../isCursorCollapsedAfterSoftBreak';

describe('isCursorCollapsedAfterSoftBreak', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    // `break` is a void inline in the real editor (see withInlines.js); mirror that
    // here so cursor navigation treats it as a single leaf instead of descending
    // into its empty text child.
    editor.isVoid = element => element.type === 'break';
    editor.isInline = element => element.type === 'break';
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  function rangeFromTo(startPath, startOffset, endPath, endOffset) {
    return {
      anchor: { path: startPath, offset: startOffset },
      focus: { path: endPath, offset: endOffset },
    };
  }

  it('returns false when there is no selection', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'hello' }] }], null);

    expect(isCursorCollapsedAfterSoftBreak(editor)).toBe(false);
  });

  it('returns false when the selection is expanded, even after a break', () => {
    const editor = buildEditor(
      [
        {
          type: 'paragraph',
          children: [{ text: 'a' }, { type: 'break', children: [{ text: '' }] }, { text: 'bc' }],
        },
      ],
      rangeFromTo([0, 2], 0, [0, 2], 1),
    );

    expect(isCursorCollapsedAfterSoftBreak(editor)).toBe(false);
  });

  it('returns true when the collapsed cursor sits right after a break element', () => {
    const editor = buildEditor(
      [
        {
          type: 'paragraph',
          children: [{ text: 'a' }, { type: 'break', children: [{ text: '' }] }, { text: 'bc' }],
        },
      ],
      pointAt([0, 2], 0),
    );

    expect(isCursorCollapsedAfterSoftBreak(editor)).toBe(true);
  });

  it('returns false when the previous node is plain text, not a break', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'a' }, { text: 'bc' }] }],
      pointAt([0, 1], 0),
    );

    expect(isCursorCollapsedAfterSoftBreak(editor)).toBe(false);
  });
});

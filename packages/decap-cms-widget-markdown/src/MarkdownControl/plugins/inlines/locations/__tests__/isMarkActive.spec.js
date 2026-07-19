import { createEditor } from 'slate';

import isMarkActive from '../isMarkActive';

describe('isMarkActive', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  function rangeAt(anchorPath, anchorOffset, focusPath, focusOffset) {
    return {
      anchor: { path: anchorPath, offset: anchorOffset },
      focus: { path: focusPath, offset: focusOffset },
    };
  }

  it('returns false when there is no selection', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text', bold: true }] }],
      null,
    );

    expect(isMarkActive(editor, 'bold')).toBe(false);
  });

  it('returns false when the cursor is on unformatted text', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(isMarkActive(editor, 'bold')).toBe(false);
  });

  it('returns true when the cursor is on text carrying the requested mark', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'bold text', bold: true }] }],
      pointAt([0, 0], 2),
    );

    expect(isMarkActive(editor, 'bold')).toBe(true);
  });

  it('checks the specific mark format requested, ignoring other active marks', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'bold text', bold: true }] }],
      pointAt([0, 0], 2),
    );

    expect(isMarkActive(editor, 'italic')).toBe(false);
  });

  it('for an expanded selection, goes by the marks at the anchor of the range', () => {
    const editor = buildEditor(
      [
        {
          type: 'paragraph',
          children: [{ text: 'plain ' }, { text: 'bold', bold: true }],
        },
      ],
      rangeAt([0, 1], 0, [0, 1], 4),
    );

    // The whole range sits inside the bold run, so it reads as active...
    expect(isMarkActive(editor, 'bold')).toBe(true);

    editor.selection = rangeAt([0, 0], 0, [0, 1], 4);
    // ...but as soon as the anchor moves back into the plain run, Slate's `Editor.marks`
    // reports the marks at the anchor rather than the intersection across the range.
    expect(isMarkActive(editor, 'bold')).toBe(false);
  });
});

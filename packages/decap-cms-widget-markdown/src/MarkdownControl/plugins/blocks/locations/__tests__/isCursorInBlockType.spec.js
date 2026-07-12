import { createEditor } from 'slate';

import isCursorInBlockType from '../isCursorInBlockType';

describe('isCursorInBlockType', () => {
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

    expect(isCursorInBlockType(editor, 'code-block')).toBe(false);
  });

  it('returns true when the cursor is inside a matching block type', () => {
    const editor = buildEditor(
      [
        {
          type: 'code-block',
          children: [{ type: 'code-block-line', children: [{ text: 'const x = 1;' }] }],
        },
      ],
      pointAt([0, 0, 0], 2),
    );

    expect(isCursorInBlockType(editor, 'code-block')).toBe(true);
  });

  it('returns false when the cursor is inside a plain paragraph (no candidate block)', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorInBlockType(editor, 'code-block')).toBe(false);
  });

  it('excludes heading blocks by default so a heading type does not match', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorInBlockType(editor, 'heading')).toBe(false);
  });

  it('includes heading blocks when ignoreHeadings is true', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 2),
    );

    expect(isCursorInBlockType(editor, 'heading', true)).toBe(true);
  });
});

import { createEditor } from 'slate';

import isCursorAtNoninitialParagraphStart from '../isCursorAtNoninitialParagraphStart';

describe('isCursorAtNoninitialParagraphStart', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  const listItemWithTwoParagraphs = [
    {
      type: 'bulleted-list',
      children: [
        {
          type: 'list-item',
          children: [
            { type: 'paragraph', children: [{ text: 'first paragraph' }] },
            { type: 'paragraph', children: [{ text: 'second paragraph' }] },
          ],
        },
      ],
    },
  ];

  it('returns true when the cursor is at offset 0 of a non-initial paragraph', () => {
    const editor = buildEditor(listItemWithTwoParagraphs, pointAt([0, 0, 1, 0], 0));

    expect(isCursorAtNoninitialParagraphStart(editor)).toBe(true);
  });

  it('returns false when the cursor is at offset 0 of the initial paragraph', () => {
    const editor = buildEditor(listItemWithTwoParagraphs, pointAt([0, 0, 0, 0], 0));

    expect(isCursorAtNoninitialParagraphStart(editor)).toBe(false);
  });

  it('returns false when there is no selection', () => {
    const editor = buildEditor(listItemWithTwoParagraphs, null);

    expect(isCursorAtNoninitialParagraphStart(editor)).toBe(false);
  });
});

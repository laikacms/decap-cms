import { createEditor } from 'slate';

import areCurrentAndPreviousBlocksOfType from '../areCurrentAndPreviousBlocksOfType';

describe('areCurrentAndPreviousBlocksOfType', () => {
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
    const editor = buildEditor([{ type: 'block-quote', children: [{ text: 'a' }] }], null);

    expect(areCurrentAndPreviousBlocksOfType(editor, 'block-quote')).toBe(false);
  });

  it('returns true when the current block and the previous block of the given type match', () => {
    const editor = buildEditor(
      [
        { type: 'block-quote', children: [{ text: 'first' }] },
        { type: 'block-quote', children: [{ text: 'second' }] },
      ],
      pointAt([1, 0], 2),
    );

    expect(areCurrentAndPreviousBlocksOfType(editor, 'block-quote')).toBe(true);
  });

  it('is falsy when no ancestor node matches the requested previous-block type', () => {
    const editor = buildEditor(
      [
        { type: 'block-quote', children: [{ text: 'first' }] },
        { type: 'block-quote', children: [{ text: 'second' }] },
      ],
      pointAt([1, 0], 2),
    );

    expect(areCurrentAndPreviousBlocksOfType(editor, 'code-block')).toBeFalsy();
  });
});

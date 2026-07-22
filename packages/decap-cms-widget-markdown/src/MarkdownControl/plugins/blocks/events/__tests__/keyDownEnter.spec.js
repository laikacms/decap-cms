import { createEditor } from 'slate';

import keyDownEnter from '../keyDownEnter';
import splitIntoParagraph from '../../transforms/splitIntoParagraph';
import unwrapIfCursorAtStart from '../../transforms/unwrapIfCursorAtStart';

jest.mock('../../transforms/splitIntoParagraph');
jest.mock('../../transforms/unwrapIfCursorAtStart');

describe('keyDownEnter', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'hi' }] }], null);

    const result = keyDownEnter(editor);

    expect(result).toBeUndefined();
    expect(splitIntoParagraph).not.toHaveBeenCalled();
    expect(unwrapIfCursorAtStart).not.toHaveBeenCalled();
  });

  it('splits into a paragraph and returns true when the cursor is at the end of a heading', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 5),
    );

    const result = keyDownEnter(editor);

    expect(splitIntoParagraph).toHaveBeenCalledWith(editor);
    expect(result).toBe(true);
    expect(unwrapIfCursorAtStart).not.toHaveBeenCalled();
  });

  it('does nothing when the cursor is inside a heading but not at its end', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 2),
    );

    const result = keyDownEnter(editor);

    expect(splitIntoParagraph).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('delegates to unwrapIfCursorAtStart when the cursor is not inside a heading', () => {
    unwrapIfCursorAtStart.mockReturnValue('unwrapped');
    const editor = buildEditor(
      [{ type: 'block-quote', children: [{ text: 'Quoted text' }] }],
      pointAt([0, 0], 2),
    );

    const result = keyDownEnter(editor);

    expect(unwrapIfCursorAtStart).toHaveBeenCalledWith(editor);
    expect(result).toBe('unwrapped');
    expect(splitIntoParagraph).not.toHaveBeenCalled();
  });
});

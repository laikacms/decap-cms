import { Transforms, createEditor } from 'slate';

import keyDownBackspace from '../keyDownBackspace';
import unwrapIfCursorAtStart from '../../transforms/unwrapIfCursorAtStart';
import lowestMatchedAncestor from '../../../matchers/lowestMatchedAncestor';

jest.mock('../../transforms/unwrapIfCursorAtStart');

describe('keyDownBackspace', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'hi' }] }], null);

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(unwrapIfCursorAtStart).not.toHaveBeenCalled();
  });

  it('returns undefined when the cursor is at the start of a non-empty heading', () => {
    const editor = buildEditor(
      [{ type: 'heading-two', children: [{ text: 'Title' }] }],
      pointAt([0, 0], 0),
    );

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(unwrapIfCursorAtStart).not.toHaveBeenCalled();
  });

  it('merges with the previous quote and returns true when the cursor is at the start of a quote directly after another quote', () => {
    const mergeNodesSpy = jest.spyOn(Transforms, 'mergeNodes').mockImplementation(() => {});
    const editor = buildEditor(
      [
        { type: 'quote', children: [{ text: 'first' }] },
        { type: 'quote', children: [{ text: 'second' }] },
      ],
      pointAt([1, 0], 0),
    );

    const result = keyDownBackspace(editor);

    expect(mergeNodesSpy).toHaveBeenCalledTimes(1);
    const [mergeEditorArg, mergeOptionsArg] = mergeNodesSpy.mock.calls[0];
    expect(mergeEditorArg).toBe(editor);
    expect(mergeOptionsArg.mode).toBe(lowestMatchedAncestor(editor, 'quote').mode);
    expect(mergeOptionsArg.match({ type: 'quote', children: [] })).toBe(true);
    expect(mergeOptionsArg.match({ type: 'paragraph', children: [] })).toBe(false);
    expect(result).toBe(true);
    expect(unwrapIfCursorAtStart).not.toHaveBeenCalled();
  });

  it('delegates to unwrapIfCursorAtStart with mergeWithPrevious=true as the fallback case', () => {
    unwrapIfCursorAtStart.mockReturnValue('unwrapped');
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    const result = keyDownBackspace(editor);

    expect(unwrapIfCursorAtStart).toHaveBeenCalledWith(editor, true);
    expect(result).toBe('unwrapped');
  });
});

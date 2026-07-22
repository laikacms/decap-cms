import { Transforms } from 'slate';

import toggleBlock from '../toggleBlock';
import isCursorInBlockType from '../../locations/isCursorInBlockType';
import getListTypeAtCursor from '../../locations/getListTypeAtCursor';
import wrapListItemsInBlock from '../../transforms/wrapListItemsInBlock';

jest.mock('../../locations/isCursorInBlockType');
jest.mock('../../locations/getListTypeAtCursor');
jest.mock('../../transforms/wrapListItemsInBlock');

describe('toggleBlock', () => {
  function point(path, offset) {
    return { path, offset };
  }

  function buildSelection(anchorPath, anchorOffset, focusPath, focusOffset) {
    return {
      anchor: point(anchorPath, anchorOffset),
      focus: point(focusPath, focusOffset),
    };
  }

  let setNodesSpy;
  let wrapNodesSpy;
  let unwrapNodesSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    setNodesSpy = jest.spyOn(Transforms, 'setNodes').mockImplementation(() => {});
    wrapNodesSpy = jest.spyOn(Transforms, 'wrapNodes').mockImplementation(() => {});
    unwrapNodesSpy = jest.spyOn(Transforms, 'unwrapNodes').mockImplementation(() => {});
    getListTypeAtCursor.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when there is no selection', () => {
    const editor = { selection: null };

    const result = toggleBlock(editor, 'block-quote');

    expect(result).toBeUndefined();
    expect(isCursorInBlockType).not.toHaveBeenCalled();
    expect(setNodesSpy).not.toHaveBeenCalled();
    expect(wrapNodesSpy).not.toHaveBeenCalled();
  });

  it('converts to the heading type when the heading is not already active', () => {
    isCursorInBlockType.mockReturnValue(false);
    const editor = { selection: buildSelection([0, 0], 2, [0, 0], 2) };

    toggleBlock(editor, 'heading-two');

    expect(isCursorInBlockType).toHaveBeenCalledWith(editor, 'heading-two', true, false);
    expect(setNodesSpy).toHaveBeenCalledWith(editor, { type: 'heading-two' });
  });

  it('converts an active heading back into a paragraph', () => {
    isCursorInBlockType.mockReturnValue(true);
    const editor = { selection: buildSelection([0, 0], 2, [0, 0], 2) };

    toggleBlock(editor, 'heading-two');

    expect(setNodesSpy).toHaveBeenCalledWith(editor, { type: 'paragraph' });
  });

  it('wraps the selection with the block type when it is not active and there is no surrounding list', () => {
    isCursorInBlockType.mockReturnValue(false);
    getListTypeAtCursor.mockReturnValue(null);
    const editor = { selection: buildSelection([0, 0], 2, [0, 0], 2) };

    const result = toggleBlock(editor, 'block-quote');

    expect(wrapNodesSpy).toHaveBeenCalledWith(editor, { type: 'block-quote' });
    expect(wrapListItemsInBlock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('wraps the selected list items in the block when the selection spans multiple list items', () => {
    isCursorInBlockType.mockReturnValue(false);
    getListTypeAtCursor.mockReturnValue('bulleted-list');
    const editor = { selection: buildSelection([0, 0, 0, 0], 0, [0, 1, 0, 0], 0) };

    toggleBlock(editor, 'block-quote');

    expect(wrapListItemsInBlock).toHaveBeenCalledWith(editor, 'block-quote', 'bulleted-list');
    expect(wrapNodesSpy).not.toHaveBeenCalled();
  });

  it('wraps a single node directly when the selection stays within one list item', () => {
    isCursorInBlockType.mockReturnValue(false);
    getListTypeAtCursor.mockReturnValue('bulleted-list');
    const editor = { selection: buildSelection([0, 0, 0, 0], 0, [0, 0, 0, 1], 2) };

    toggleBlock(editor, 'block-quote');

    expect(wrapListItemsInBlock).not.toHaveBeenCalled();
    expect(wrapNodesSpy).toHaveBeenCalledWith(editor, { type: 'block-quote' });
  });

  it('unwraps the block when it is already active', () => {
    isCursorInBlockType.mockReturnValue(true);
    const editor = { selection: buildSelection([0, 0], 2, [0, 0], 2) };

    const result = toggleBlock(editor, 'block-quote');

    expect(unwrapNodesSpy).toHaveBeenCalled();
    const matchFn = unwrapNodesSpy.mock.calls[0][1].match;
    expect(matchFn({ type: 'block-quote' })).toBe(true);
    expect(matchFn({ type: 'paragraph' })).toBe(false);
    expect(result).toBeUndefined();
  });
});

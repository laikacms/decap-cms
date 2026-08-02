import { Editor, Transforms } from 'slate';

import keyDownTab from '../keyDownTab';
import isSelectionWithinNoninitialListItem from '../../locations/isSelectionWithinNoninitialListItem';
import lowestMatchedAncestor from '../../../matchers/lowestMatchedAncestor';
import moveListToListItem from '../../transforms/moveListToListItem';

jest.mock('slate', () => ({
  Editor: {
    withoutNormalizing: jest.fn((editor, fn) => fn()),
    above: jest.fn(),
    previous: jest.fn(),
    normalize: jest.fn(),
  },
  Transforms: { wrapNodes: jest.fn() },
}));
jest.mock('../../locations/isSelectionWithinNoninitialListItem');
jest.mock('../../../matchers/lowestMatchedAncestor');
jest.mock('../../transforms/moveListToListItem');

describe('keyDownTab', () => {
  const ancestorMatcher = { match: 'list-item-matcher', mode: 'lowest' };

  beforeEach(() => {
    jest.clearAllMocks();
    lowestMatchedAncestor.mockReturnValue(ancestorMatcher);
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = { selection: null };

    const result = keyDownTab(editor);

    expect(result).toBeUndefined();
    expect(isSelectionWithinNoninitialListItem).not.toHaveBeenCalled();
    expect(Transforms.wrapNodes).not.toHaveBeenCalled();
  });

  it('returns undefined when the selection is not within a non-initial list item', () => {
    isSelectionWithinNoninitialListItem.mockReturnValue(false);
    const editor = { selection: { anchor: { path: [0, 1, 0, 0] }, focus: { path: [0, 1, 0, 0] } } };

    const result = keyDownTab(editor);

    expect(isSelectionWithinNoninitialListItem).toHaveBeenCalledWith(editor);
    expect(result).toBeUndefined();
    expect(Transforms.wrapNodes).not.toHaveBeenCalled();
  });

  it('wraps the evened selection into a new bulleted list and moves it under the previous list item', () => {
    isSelectionWithinNoninitialListItem.mockReturnValue(true);
    const editor = {
      selection: { anchor: { path: [0, 1, 0, 0] }, focus: { path: [0, 1, 0, 0] } },
    };
    const newListPath = [0, 0, 1];
    const parentNode = [{ children: [{}, {}] }, [0, 0]];
    Editor.above.mockReturnValue([{}, newListPath]);
    Editor.previous.mockReturnValue(parentNode);

    keyDownTab(editor);

    expect(Transforms.wrapNodes).toHaveBeenCalledWith(
      editor,
      { type: 'bulleted-list' },
      {
        ...ancestorMatcher,
        at: {
          anchor: { offset: 0, path: [0, 1, 0, 0] },
          focus: { offset: 0, path: [0, 1, 0, 0] },
        },
      },
    );
    expect(Editor.above).toHaveBeenCalledWith(editor, ancestorMatcher);
    expect(Editor.previous).toHaveBeenCalledWith(editor, { at: newListPath });
    expect(moveListToListItem).toHaveBeenCalledWith(editor, newListPath, parentNode);
    expect(Editor.normalize).toHaveBeenCalledWith(editor);
  });

  it('evens an uneven selection down to the shallower edge before wrapping', () => {
    isSelectionWithinNoninitialListItem.mockReturnValue(true);
    // focus is nested one level deeper than anchor (e.g. selection spans into a nested list)
    const editor = {
      selection: { anchor: { path: [0, 1, 0, 0] }, focus: { path: [0, 1, 0, 1, 0, 0] } },
    };
    Editor.above.mockReturnValue([{}, [0, 0, 1]]);
    Editor.previous.mockReturnValue([{ children: [] }, [0, 0]]);

    keyDownTab(editor);

    expect(Transforms.wrapNodes).toHaveBeenCalledWith(
      editor,
      { type: 'bulleted-list' },
      {
        ...ancestorMatcher,
        at: {
          anchor: { offset: 0, path: [0, 1, 0, 0] },
          focus: { offset: 0, path: [0, 1, 0, 0] },
        },
      },
    );
  });
});

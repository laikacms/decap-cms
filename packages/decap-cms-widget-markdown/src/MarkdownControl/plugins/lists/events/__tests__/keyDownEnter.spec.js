import { Range, Transforms } from 'slate';

import keyDownEnter from '../keyDownEnter';
import splitListItem from '../../transforms/splitListItem';
import isCursorAtListItemStart from '../../locations/isCursorAtListItemStart';
import liftListItem from '../../transforms/liftListItem';
import convertParagraphToListItem from '../../transforms/convertParagraphToListItem';
import isCursorAtNoninitialParagraphStart from '../../locations/isCursorAtNoninitialParagraphStart';
import splitToNestedList from '../../transforms/splitToNestedList';
import getListContainedInListItem from '../../selectors/getListContainedInListItem';

jest.mock('slate', () => ({
  Range: { isExpanded: jest.fn() },
  Transforms: { delete: jest.fn() },
}));
jest.mock('../../transforms/splitListItem');
jest.mock('../../locations/isCursorAtListItemStart');
jest.mock('../../transforms/liftListItem');
jest.mock('../../transforms/convertParagraphToListItem');
jest.mock('../../locations/isCursorAtNoninitialParagraphStart');
jest.mock('../../transforms/splitToNestedList');
jest.mock('../../selectors/getListContainedInListItem');

describe('keyDownEnter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Range.isExpanded.mockReturnValue(false);
    isCursorAtListItemStart.mockReturnValue(false);
    getListContainedInListItem.mockReturnValue(false);
    isCursorAtNoninitialParagraphStart.mockReturnValue(false);
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = { selection: null };

    const result = keyDownEnter(editor);

    expect(result).toBeUndefined();
    expect(Range.isExpanded).not.toHaveBeenCalled();
    expect(splitListItem).not.toHaveBeenCalled();
  });

  it('deletes the current selection first when it is expanded', () => {
    Range.isExpanded.mockReturnValue(true);
    const editor = { selection: { anchor: {}, focus: {} } };

    keyDownEnter(editor);

    expect(Transforms.delete).toHaveBeenCalledWith(editor);
    // still falls through to the default new-item case afterwards
    expect(splitListItem).toHaveBeenCalledWith(editor);
  });

  it('lifts the list item when the cursor is at the start of the list item', () => {
    isCursorAtListItemStart.mockReturnValue(true);
    liftListItem.mockReturnValue('lifted');
    const editor = { selection: { anchor: {}, focus: {} } };

    const result = keyDownEnter(editor);

    expect(liftListItem).toHaveBeenCalledWith(editor);
    expect(result).toBe('lifted');
    expect(splitListItem).not.toHaveBeenCalled();
  });

  it('splits into the nested list when the list item contains a nested list', () => {
    getListContainedInListItem.mockReturnValue([{ type: 'bulleted-list' }]);
    splitToNestedList.mockReturnValue('nested');
    const editor = { selection: { anchor: {}, focus: {} } };

    const result = keyDownEnter(editor);

    expect(splitToNestedList).toHaveBeenCalledWith(editor, 'bulleted-list');
    expect(result).toBe('nested');
    expect(splitListItem).not.toHaveBeenCalled();
  });

  it('does not treat a non-list sibling node as a nested list', () => {
    getListContainedInListItem.mockReturnValue([{ type: 'paragraph' }]);
    const editor = { selection: { anchor: {}, focus: {} } };

    keyDownEnter(editor);

    expect(splitToNestedList).not.toHaveBeenCalled();
    expect(splitListItem).toHaveBeenCalledWith(editor);
  });

  it('converts a non-initial paragraph to a list item', () => {
    isCursorAtNoninitialParagraphStart.mockReturnValue(true);
    convertParagraphToListItem.mockReturnValue('converted');
    const editor = { selection: { anchor: {}, focus: {} } };

    const result = keyDownEnter(editor);

    expect(convertParagraphToListItem).toHaveBeenCalledWith(editor);
    expect(result).toBe('converted');
    expect(splitListItem).not.toHaveBeenCalled();
  });

  it('creates a new list item by default', () => {
    const editor = { selection: { anchor: {}, focus: {} } };

    keyDownEnter(editor);

    expect(splitListItem).toHaveBeenCalledWith(editor);
    expect(liftListItem).not.toHaveBeenCalled();
    expect(splitToNestedList).not.toHaveBeenCalled();
    expect(convertParagraphToListItem).not.toHaveBeenCalled();
  });
});

import toggleListType from '../toggleListType';
import isCursorInListItem from '../../locations/isCursorInListItem';
import getLowestAncestorList from '../../selectors/getLowestAncestorList';
import wrapSelectionInList from '../../transforms/wrapSelectionInList';
import changeListType from '../../transforms/changeListType';
import unwrapSelectionFromList from '../../transforms/unwrapSelectionFromList';

jest.mock('../../locations/isCursorInListItem');
jest.mock('../../selectors/getLowestAncestorList');
jest.mock('../../transforms/wrapSelectionInList');
jest.mock('../../transforms/changeListType');
jest.mock('../../transforms/unwrapSelectionFromList');

describe('toggleListType', () => {
  const editor = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the selection in a new list when the cursor is not in a list item', () => {
    isCursorInListItem.mockReturnValue(false);
    wrapSelectionInList.mockReturnValue('wrapped');

    const result = toggleListType(editor, 'bulleted-list');

    expect(wrapSelectionInList).toHaveBeenCalledWith(editor, 'bulleted-list');
    expect(result).toBe('wrapped');
    expect(getLowestAncestorList).not.toHaveBeenCalled();
    expect(changeListType).not.toHaveBeenCalled();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
  });

  it('changes the list type when the cursor is in a list of a different type', () => {
    isCursorInListItem.mockReturnValue(true);
    getLowestAncestorList.mockReturnValue([{ type: 'bulleted-list' }, [0]]);
    changeListType.mockReturnValue('changed');

    const result = toggleListType(editor, 'numbered-list');

    expect(changeListType).toHaveBeenCalledWith(editor, 'numbered-list');
    expect(result).toBe('changed');
    expect(wrapSelectionInList).not.toHaveBeenCalled();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
  });

  it('unwraps the selection from the list when the cursor is already in a list of the matching type', () => {
    isCursorInListItem.mockReturnValue(true);
    getLowestAncestorList.mockReturnValue([{ type: 'bulleted-list' }, [0]]);
    unwrapSelectionFromList.mockReturnValue('unwrapped');

    const result = toggleListType(editor, 'bulleted-list');

    expect(unwrapSelectionFromList).toHaveBeenCalledWith(editor);
    expect(result).toBe('unwrapped');
    expect(changeListType).not.toHaveBeenCalled();
    expect(wrapSelectionInList).not.toHaveBeenCalled();
  });

  it('unwraps the selection from the list when there is no matched ancestor list to compare against', () => {
    isCursorInListItem.mockReturnValue(true);
    getLowestAncestorList.mockReturnValue(false);
    unwrapSelectionFromList.mockReturnValue('unwrapped');

    const result = toggleListType(editor, 'bulleted-list');

    expect(unwrapSelectionFromList).toHaveBeenCalledWith(editor);
    expect(result).toBe('unwrapped');
    expect(changeListType).not.toHaveBeenCalled();
  });
});

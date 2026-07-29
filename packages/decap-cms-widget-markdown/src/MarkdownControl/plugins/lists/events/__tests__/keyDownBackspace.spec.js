import { Range } from 'slate';

import keyDownBackspace from '../keyDownBackspace';
import isCursorInListItem from '../../locations/isCursorInListItem';
import isSelectionWithinNoninitialListItem from '../../locations/isSelectionWithinNoninitialListItem';
import unwrapSelectionFromList from '../../transforms/unwrapSelectionFromList';
import mergeWithPreviousListItem from '../../transforms/mergeWithPreviousListItem';
import isCursorAtNoninitialParagraphStart from '../../locations/isCursorAtNoninitialParagraphStart';

jest.mock('slate', () => ({
  Range: { isCollapsed: jest.fn() },
}));
jest.mock('../../locations/isCursorInListItem');
jest.mock('../../locations/isSelectionWithinNoninitialListItem');
jest.mock('../../transforms/unwrapSelectionFromList');
jest.mock('../../transforms/mergeWithPreviousListItem');
jest.mock('../../locations/isCursorAtNoninitialParagraphStart');

describe('keyDownBackspace', () => {
  function buildEditor(offset = 0) {
    return { selection: { anchor: { offset }, focus: { offset } } };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    Range.isCollapsed.mockReturnValue(true);
    isCursorInListItem.mockReturnValue(true);
    isCursorAtNoninitialParagraphStart.mockReturnValue(false);
    isSelectionWithinNoninitialListItem.mockReturnValue(false);
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = { selection: null };

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(Range.isCollapsed).not.toHaveBeenCalled();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
    expect(mergeWithPreviousListItem).not.toHaveBeenCalled();
  });

  it('returns undefined when the selection is expanded', () => {
    Range.isCollapsed.mockReturnValue(false);
    const editor = buildEditor();

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
  });

  it('returns undefined when the cursor offset is not zero', () => {
    const editor = buildEditor(2);

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(isCursorInListItem).not.toHaveBeenCalled();
  });

  it('returns undefined when the cursor is not immediately in a list item', () => {
    isCursorInListItem.mockReturnValue(false);
    const editor = buildEditor();

    const result = keyDownBackspace(editor);

    expect(isCursorInListItem).toHaveBeenCalledWith(editor, true);
    expect(result).toBeUndefined();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
  });

  it('returns undefined when the cursor is at the start of a non-initial paragraph', () => {
    isCursorAtNoninitialParagraphStart.mockReturnValue(true);
    const editor = buildEditor();

    const result = keyDownBackspace(editor);

    expect(result).toBeUndefined();
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
    expect(mergeWithPreviousListItem).not.toHaveBeenCalled();
  });

  it('merges with the previous list item and returns false when within a non-initial list item', () => {
    isSelectionWithinNoninitialListItem.mockReturnValue(true);
    const editor = buildEditor();

    const result = keyDownBackspace(editor);

    expect(mergeWithPreviousListItem).toHaveBeenCalledWith(editor);
    expect(unwrapSelectionFromList).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('unwraps the selection from the list and returns false when in the initial list item', () => {
    isSelectionWithinNoninitialListItem.mockReturnValue(false);
    const editor = buildEditor();

    const result = keyDownBackspace(editor);

    expect(unwrapSelectionFromList).toHaveBeenCalledWith(editor);
    expect(mergeWithPreviousListItem).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

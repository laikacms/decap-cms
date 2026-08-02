import { Editor, Transforms } from 'slate';

import keyDownShiftTab from '../keyDownShiftTab';
import lowestMatchedAncestor from '../../../matchers/lowestMatchedAncestor';
import matchedAncestors from '../../../matchers/matchedAncestors';

jest.mock('slate', () => ({
  Editor: {
    nodes: jest.fn(),
    withoutNormalizing: jest.fn((editor, fn) => fn()),
    normalize: jest.fn(),
  },
  Transforms: { liftNodes: jest.fn() },
}));
jest.mock('../../../matchers/lowestMatchedAncestor');
jest.mock('../../../matchers/matchedAncestors');

describe('keyDownShiftTab', () => {
  const listMatcher = { match: 'list-matcher', mode: undefined };
  const listItemMatcher = { match: 'list-item-matcher', mode: 'lowest' };

  beforeEach(() => {
    jest.clearAllMocks();
    matchedAncestors.mockReturnValue(listMatcher);
    lowestMatchedAncestor.mockReturnValue(listItemMatcher);
  });

  it('returns undefined and does nothing when there is no selection', () => {
    const editor = { selection: null };

    const result = keyDownShiftTab(editor);

    expect(result).toBeUndefined();
    expect(Editor.nodes).not.toHaveBeenCalled();
    expect(Transforms.liftNodes).not.toHaveBeenCalled();
  });

  it('does nothing when the selection is nested inside fewer than two lists', () => {
    Editor.nodes.mockReturnValue([{}]);
    const editor = { selection: { anchor: {}, focus: {} } };

    const result = keyDownShiftTab(editor);

    expect(Editor.nodes).toHaveBeenCalledWith(editor, listMatcher);
    expect(result).toBeUndefined();
    expect(Transforms.liftNodes).not.toHaveBeenCalled();
    expect(Editor.normalize).not.toHaveBeenCalled();
  });

  it('lifts the list item twice and normalizes when nested inside two or more lists', () => {
    Editor.nodes.mockReturnValue([{}, {}]);
    const editor = { selection: { anchor: {}, focus: {} } };

    keyDownShiftTab(editor);

    expect(Transforms.liftNodes).toHaveBeenCalledTimes(2);
    expect(Transforms.liftNodes).toHaveBeenNthCalledWith(1, editor, {
      ...listItemMatcher,
      split: true,
    });
    expect(Transforms.liftNodes).toHaveBeenNthCalledWith(2, editor, {
      ...listItemMatcher,
      split: true,
    });
    expect(Editor.normalize).toHaveBeenCalledWith(editor);
  });
});

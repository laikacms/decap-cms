import isHotkey from 'is-hotkey';
import { Editor, Transforms } from 'slate';

import keyDown from '../keyDown';
import keyDownEnter from '../keyDownEnter';
import keyDownBackspace from '../keyDownBackspace';
import isCursorInNonDefaultBlock from '../../locations/isCursorInNonDefaultBlock';
import toggleBlock from '../toggleBlock';
import isCursorCollapsedAfterSoftBreak from '../../locations/isCursorCollapsedAfterSoftBreak';

jest.mock('is-hotkey');
jest.mock('slate', () => ({
  Editor: { previous: jest.fn() },
  Transforms: { removeNodes: jest.fn() },
}));
jest.mock('../keyDownEnter');
jest.mock('../keyDownBackspace');
jest.mock('../../locations/isCursorInNonDefaultBlock');
jest.mock('../toggleBlock');
jest.mock('../../locations/isCursorCollapsedAfterSoftBreak');

describe('keyDown', () => {
  function buildEditor(selection = { anchor: {}, focus: {} }) {
    return { selection };
  }

  function buildEvent() {
    return { preventDefault: jest.fn() };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    isHotkey.mockReturnValue(false);
    isCursorCollapsedAfterSoftBreak.mockReturnValue(false);
    isCursorInNonDefaultBlock.mockReturnValue(false);
  });

  it('does nothing and returns undefined when there is no selection', () => {
    const editor = buildEditor(null);
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(isHotkey).not.toHaveBeenCalled();
  });

  it('toggles the matching heading block and prevents default when a heading hotkey matches', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+2');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(toggleBlock).toHaveBeenCalledWith(editor, 'heading-two');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('stops checking further heading hotkeys once one matches', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+1');
    const editor = buildEditor();
    const event = buildEvent();

    keyDown(event, editor);

    expect(toggleBlock).toHaveBeenCalledTimes(1);
    expect(toggleBlock).toHaveBeenCalledWith(editor, 'heading-one');
  });

  it('removes the previous node and prevents default on backspace right after a soft break', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'backspace');
    isCursorCollapsedAfterSoftBreak.mockReturnValue(true);
    Editor.previous.mockReturnValue([{ type: 'break' }, [0, 1]]);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(Transforms.removeNodes).toHaveBeenCalledWith(editor, { at: [0, 1] });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('does nothing further when the cursor is not inside a non-default block', () => {
    isHotkey.mockReturnValue(false);
    isCursorInNonDefaultBlock.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(keyDownEnter).not.toHaveBeenCalled();
    expect(keyDownBackspace).not.toHaveBeenCalled();
  });

  it('invokes keyDownEnter and prevents default when enter is intercepted inside a non-default block', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'enter');
    isCursorInNonDefaultBlock.mockReturnValue(true);
    keyDownEnter.mockReturnValue(true);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownEnter).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('does not prevent default when keyDownEnter does not intercept the event', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'enter');
    isCursorInNonDefaultBlock.mockReturnValue(true);
    keyDownEnter.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('invokes keyDownBackspace and prevents default when backspace is intercepted inside a non-default block', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'backspace');
    isCursorInNonDefaultBlock.mockReturnValue(true);
    keyDownBackspace.mockReturnValue(true);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownBackspace).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('does nothing when no hotkey matches and the cursor is inside a non-default block', () => {
    isHotkey.mockReturnValue(false);
    isCursorInNonDefaultBlock.mockReturnValue(true);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(keyDownEnter).not.toHaveBeenCalled();
    expect(keyDownBackspace).not.toHaveBeenCalled();
  });
});

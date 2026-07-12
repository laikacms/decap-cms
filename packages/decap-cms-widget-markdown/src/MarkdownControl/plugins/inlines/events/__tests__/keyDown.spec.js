import isHotkey from 'is-hotkey';

import keyDown from '../keyDown';
import toggleMark from '../toggleMark';
import keyDownShiftEnter from '../keyDownShiftEnter';
import toggleLink from '../toggleLink';

jest.mock('is-hotkey');
jest.mock('../toggleMark');
jest.mock('../keyDownShiftEnter');
jest.mock('../toggleLink');

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
  });

  it('does nothing and returns undefined when there is no selection', () => {
    const editor = buildEditor(null);
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(isHotkey).not.toHaveBeenCalled();
  });

  it('toggles the matching mark and prevents default when a mark hotkey matches', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+b');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(toggleMark).toHaveBeenCalledWith(editor, 'bold');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
    expect(toggleLink).not.toHaveBeenCalled();
    expect(keyDownShiftEnter).not.toHaveBeenCalled();
  });

  it('stops checking further mark hotkeys once one matches', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+i');
    const editor = buildEditor();
    const event = buildEvent();

    keyDown(event, editor);

    expect(toggleMark).toHaveBeenCalledTimes(1);
    expect(toggleMark).toHaveBeenCalledWith(editor, 'italic');
  });

  it('invokes toggleLink and prevents default on mod+k', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+k');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(toggleLink).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(toggleMark).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('returns the value of toggleLink on mod+k', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'mod+k');
    toggleLink.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    expect(keyDown(event, editor)).toBe(false);
  });

  it('invokes keyDownShiftEnter and prevents default on shift+enter', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'shift+enter');
    keyDownShiftEnter.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownShiftEnter).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('does nothing when no hotkey matches', () => {
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(toggleMark).not.toHaveBeenCalled();
    expect(toggleLink).not.toHaveBeenCalled();
    expect(keyDownShiftEnter).not.toHaveBeenCalled();
  });
});

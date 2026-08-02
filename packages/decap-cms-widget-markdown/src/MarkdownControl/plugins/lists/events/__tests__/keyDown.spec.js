import isHotkey from 'is-hotkey';

import keyDown from '../keyDown';
import keyDownEnter from '../keyDownEnter';
import keyDownTab from '../keyDownTab';
import keyDownShiftTab from '../keyDownShiftTab';
import keyDownBackspace from '../keyDownBackspace';

jest.mock('is-hotkey');
jest.mock('../keyDownEnter');
jest.mock('../keyDownTab');
jest.mock('../keyDownShiftTab');
jest.mock('../keyDownBackspace');

describe('keyDown', () => {
  function buildEditor(isListItem = true) {
    return { isListItem: jest.fn().mockReturnValue(isListItem) };
  }

  function buildEvent() {
    return { preventDefault: jest.fn() };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    isHotkey.mockReturnValue(false);
  });

  it('returns early without checking hotkeys when the cursor is not in a list item', () => {
    const editor = buildEditor(false);
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(isHotkey).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('handles enter by delegating to keyDownEnter, preventing default, and returning false', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'enter');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownEnter).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('prevents default and returns false when keyDownBackspace intercepts the event', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'backspace');
    keyDownBackspace.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownBackspace).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('does not prevent default when keyDownBackspace does not intercept the event', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'backspace');
    keyDownBackspace.mockReturnValue(undefined);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('handles tab by preventing default and returning the keyDownTab result', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'tab');
    keyDownTab.mockReturnValue('tab-result');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownTab).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe('tab-result');
  });

  it('handles shift+tab by preventing default and returning the keyDownShiftTab result', () => {
    isHotkey.mockImplementation(hotkey => hotkey === 'shift+tab');
    keyDownShiftTab.mockReturnValue('shift-tab-result');
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(keyDownShiftTab).toHaveBeenCalledWith(editor);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result).toBe('shift-tab-result');
  });

  it('does nothing when the cursor is in a list item but no hotkey matches', () => {
    isHotkey.mockReturnValue(false);
    const editor = buildEditor();
    const event = buildEvent();

    const result = keyDown(event, editor);

    expect(result).toBeUndefined();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(keyDownEnter).not.toHaveBeenCalled();
    expect(keyDownBackspace).not.toHaveBeenCalled();
    expect(keyDownTab).not.toHaveBeenCalled();
    expect(keyDownShiftTab).not.toHaveBeenCalled();
  });
});

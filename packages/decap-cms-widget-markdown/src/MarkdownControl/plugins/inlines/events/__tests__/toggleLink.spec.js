import { createEditor } from 'slate';

import toggleLink from '../toggleLink';
import unwrapLink from '../../transforms/unwrapLink';
import wrapLink from '../../transforms/wrapLink';

jest.mock('../../transforms/unwrapLink');
jest.mock('../../transforms/wrapLink');

describe('toggleLink', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  let promptSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    promptSpy = jest.spyOn(window, 'prompt');
  });

  afterEach(() => {
    promptSpy.mockRestore();
  });

  it('does nothing when the prompt is dismissed (returns null)', () => {
    promptSpy.mockReturnValue(null);
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    toggleLink(editor, 'Enter a URL');

    expect(wrapLink).not.toHaveBeenCalled();
    expect(unwrapLink).not.toHaveBeenCalled();
  });

  it('unwraps the link when the prompt is submitted empty', () => {
    promptSpy.mockReturnValue('');
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    toggleLink(editor, 'Enter a URL');

    expect(unwrapLink).toHaveBeenCalledWith(editor);
    expect(wrapLink).not.toHaveBeenCalled();
  });

  it('wraps the selection with a link using the submitted url', () => {
    promptSpy.mockReturnValue('https://example.com');
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    toggleLink(editor, 'Enter a URL');

    expect(wrapLink).toHaveBeenCalledWith(editor, 'https://example.com');
    expect(unwrapLink).not.toHaveBeenCalled();
  });

  it('pre-fills the prompt with the url of the currently active link', () => {
    promptSpy.mockReturnValue('https://example.com');
    const link = {
      type: 'link',
      data: { url: 'https://old.example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'before ' }, link, { text: ' after' }] }],
      pointAt([0, 1, 0], 3),
    );

    toggleLink(editor, 'Enter a URL');

    expect(promptSpy).toHaveBeenCalledWith('Enter a URL', 'https://old.example.com');
  });

  it('pre-fills the prompt with an empty string when there is no active link', () => {
    promptSpy.mockReturnValue(null);
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    toggleLink(editor, 'Enter a URL');

    expect(promptSpy).toHaveBeenCalledWith('Enter a URL', '');
  });
});

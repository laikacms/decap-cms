import { unwrapLink, upsertLink } from '@platejs/link';

import { handleLinkClick } from '../linkHandler';

jest.mock('@platejs/link', () => ({
  unwrapLink: jest.fn(),
  upsertLink: jest.fn(),
}));

describe('handleLinkClick', () => {
  const t = jest.fn(key => key);
  const editor = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.prompt.mockRestore && window.prompt.mockRestore();
  });

  it('inserts a link when the prompt returns a non-empty url', async () => {
    window.prompt = jest.fn(() => 'https://example.com');

    await handleLinkClick({ editor, t });

    expect(window.prompt).toHaveBeenCalledWith('editor.editorWidgets.markdown.linkPrompt', '');
    expect(upsertLink).toHaveBeenCalledWith(editor, {
      url: 'https://example.com',
      skipValidation: true,
    });
    expect(unwrapLink).not.toHaveBeenCalled();
  });

  it('removes the link when the prompt returns an empty string', async () => {
    window.prompt = jest.fn(() => '');

    await handleLinkClick({ editor, t });

    expect(unwrapLink).toHaveBeenCalledWith(editor);
    expect(upsertLink).not.toHaveBeenCalled();
  });

  it('does nothing when the prompt is cancelled (returns null)', async () => {
    window.prompt = jest.fn(() => null);

    await handleLinkClick({ editor, t });

    expect(upsertLink).not.toHaveBeenCalled();
    expect(unwrapLink).not.toHaveBeenCalled();
  });

  it('translates the prompt message via t()', async () => {
    window.prompt = jest.fn(() => null);

    await handleLinkClick({ editor, t });

    expect(t).toHaveBeenCalledWith('editor.editorWidgets.markdown.linkPrompt');
  });
});

import { createEditor, Editor } from 'slate';

import matchLink from '../matchLink';

describe('matchLink', () => {
  function buildEditor(children) {
    const editor = createEditor();
    editor.children = children;
    return editor;
  }

  it('matches a link element node', () => {
    const link = {
      type: 'link',
      data: { url: 'https://example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor([{ type: 'paragraph', children: [link] }]);

    const { match } = matchLink(editor);

    expect(match(link)).toBe(true);
  });

  it('does not match a non-link element', () => {
    const paragraph = { type: 'paragraph', children: [{ text: 'plain text' }] };
    const editor = buildEditor([paragraph]);

    const { match } = matchLink(editor);

    expect(match(paragraph)).toBe(false);
  });

  it('does not match the editor node itself', () => {
    const editor = buildEditor([{ type: 'paragraph', children: [{ text: 'plain text' }] }]);

    const { match } = matchLink(editor);

    expect(match(editor)).toBe(false);
    expect(Editor.isEditor(editor)).toBe(true);
  });
});

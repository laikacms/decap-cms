import { createEditor } from 'slate';

import getActiveLink from '../getActiveLink';

describe('getActiveLink', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns undefined when there is no link at the selection', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(getActiveLink(editor)).toBeUndefined();
  });

  it('returns the link node when the cursor is inside a link', () => {
    const link = {
      type: 'link',
      data: { url: 'https://example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor(
      [
        {
          type: 'paragraph',
          children: [{ text: 'before ' }, link, { text: ' after' }],
        },
      ],
      pointAt([0, 1, 0], 3),
    );

    const [activeLink, path] = getActiveLink(editor);

    expect(activeLink).toEqual(link);
    expect(path).toEqual([0, 1]);
  });

  it('returns undefined when the cursor is outside any link', () => {
    const link = {
      type: 'link',
      data: { url: 'https://example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor(
      [
        {
          type: 'paragraph',
          children: [{ text: 'before ' }, link, { text: ' after' }],
        },
      ],
      pointAt([0, 2], 2),
    );

    expect(getActiveLink(editor)).toBeUndefined();
  });
});

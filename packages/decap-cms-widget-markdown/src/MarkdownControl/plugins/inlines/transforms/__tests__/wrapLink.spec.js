import { createEditor } from 'slate';

import wrapLink from '../wrapLink';
import withInlines from '../../withInlines';

describe('wrapLink', () => {
  // wrapLink relies on `link` (and `break`) being treated as inline elements, which is
  // configured by withInlines in the real editor pipeline - without it Slate's default
  // normalization would promote the link to a block-level sibling of the paragraph.
  function buildEditor(children, selection) {
    const editor = withInlines(createEditor());
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  function rangeAt(anchorPath, anchorOffset, focusPath, focusOffset) {
    return {
      anchor: { path: anchorPath, offset: anchorOffset },
      focus: { path: focusPath, offset: focusOffset },
    };
  }

  it('inserts a new link node with the text set to the url when the selection is collapsed', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: '' }] }],
      pointAt([0, 0], 0),
    );

    wrapLink(editor, 'https://example.com');

    // Slate keeps a text node on either side of an inline element so the cursor always has
    // somewhere non-inline to sit; hence the surrounding empty text nodes.
    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          { text: '' },
          {
            type: 'link',
            data: { url: 'https://example.com' },
            children: [{ text: 'https://example.com' }],
          },
          { text: '' },
        ],
      },
    ]);
  });

  it('wraps the selected (expanded) text in a link node, preserving the selected text', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'click me please' }] }],
      rangeAt([0, 0], 0, [0, 0], 9),
    );

    wrapLink(editor, 'https://example.com');

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          { text: '' },
          {
            type: 'link',
            data: { url: 'https://example.com' },
            children: [{ text: 'click me ' }],
          },
          { text: 'please' },
        ],
      },
    ]);
  });

  it('collapses the selection to the end of the newly wrapped link', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'click me please' }] }],
      rangeAt([0, 0], 0, [0, 0], 9),
    );

    wrapLink(editor, 'https://example.com');

    // "end" of the wrapped link resolves to the last text point inside its own child,
    // i.e. the end of "click me " (9 characters) at path [0, 1, 0].
    expect(editor.selection).toEqual(rangeAt([0, 1, 0], 9, [0, 1, 0], 9));
  });

  it('updates the url of an already-active link instead of nesting a new one', () => {
    const link = {
      type: 'link',
      data: { url: 'https://old.example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'before ' }, link, { text: ' after' }] }],
      pointAt([0, 1, 0], 3),
    );

    wrapLink(editor, 'https://new.example.com');

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          { text: 'before ' },
          {
            type: 'link',
            data: { url: 'https://new.example.com' },
            children: [{ text: 'click me' }],
          },
          { text: ' after' },
        ],
      },
    ]);
  });
});

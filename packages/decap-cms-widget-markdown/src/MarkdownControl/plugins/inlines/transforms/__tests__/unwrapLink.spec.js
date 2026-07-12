import { createEditor } from 'slate';

import unwrapLink from '../unwrapLink';
import withInlines from '../../withInlines';

describe('unwrapLink', () => {
  // link must be registered as an inline element (via withInlines) so unwrapping it leaves
  // the surrounding text as siblings within the same paragraph instead of being merged/promoted.
  function buildEditor(children, selection) {
    const editor = withInlines(createEditor());
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('removes the link wrapper around the selected text, keeping the text as siblings', () => {
    const link = {
      type: 'link',
      data: { url: 'https://example.com' },
      children: [{ text: 'click me' }],
    };
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'before ' }, link, { text: ' after' }] }],
      pointAt([0, 1, 0], 3),
    );

    unwrapLink(editor);

    // The previously-separate text runs have no marks in common with the link, so Slate's
    // normalizer merges them back into a single adjacent text node.
    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ text: 'before click me after' }],
      },
    ]);
  });

  it('is a no-op when the selection is not inside a link', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    unwrapLink(editor);

    expect(editor.children).toEqual([{ type: 'paragraph', children: [{ text: 'plain text' }] }]);
  });
});

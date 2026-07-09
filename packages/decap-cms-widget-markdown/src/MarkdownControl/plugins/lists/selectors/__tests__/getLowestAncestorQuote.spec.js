import { createEditor } from 'slate';

import getLowestAncestorQuote from '../getLowestAncestorQuote';

describe('getLowestAncestorQuote', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns false when there is no selection', () => {
    const editor = buildEditor(
      [{ type: 'quote', children: [{ type: 'paragraph', children: [{ text: 'quoted' }] }] }],
      null,
    );

    expect(getLowestAncestorQuote(editor)).toBe(false);
  });

  it('returns the ancestor quote when the selection is inside a quote', () => {
    const quote = {
      type: 'quote',
      children: [{ type: 'paragraph', children: [{ text: 'quoted' }] }],
    };
    const editor = buildEditor([quote], pointAt([0, 0, 0], 2));

    const [node, path] = getLowestAncestorQuote(editor);

    expect(node).toEqual(quote);
    expect(path).toEqual([0]);
  });

  it('returns undefined when the selection has no ancestor quote', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    expect(getLowestAncestorQuote(editor)).toBeUndefined();
  });
});

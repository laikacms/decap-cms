import { createEditor, Editor } from 'slate';

import lowestMatchedAncestor from '../lowestMatchedAncestor';

describe('lowestMatchedAncestor', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns undefined when no ancestor matches the format', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    const match = Editor.above(editor, lowestMatchedAncestor(editor, 'list'));

    expect(match).toBeUndefined();
  });

  it('returns only the lowest matching ancestor when nested matching ancestors exist', () => {
    const editor = buildEditor(
      [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [
                { type: 'paragraph', children: [{ text: 'outer' }] },
                {
                  type: 'bulleted-list',
                  children: [
                    {
                      type: 'list-item',
                      children: [{ type: 'paragraph', children: [{ text: 'inner' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      pointAt([0, 0, 1, 0, 0, 0], 2),
    );

    const [node, path] = Editor.above(editor, lowestMatchedAncestor(editor, 'list'));

    expect(node.type).toBe('bulleted-list');
    expect(path).toEqual([0, 0, 1]);
  });
});

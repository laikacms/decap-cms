import { createEditor, Editor } from 'slate';

import matchedAncestors from '../matchedAncestors';

describe('matchedAncestors', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('returns no matches when no ancestor matches the format', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'plain text' }] }],
      pointAt([0, 0], 2),
    );

    const matches = Array.from(Editor.nodes(editor, matchedAncestors(editor, 'list')));

    expect(matches).toHaveLength(0);
  });

  it('returns every matching ancestor when nested matching ancestors exist', () => {
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

    const matches = Array.from(Editor.nodes(editor, matchedAncestors(editor, 'list')));

    expect(matches).toHaveLength(2);
    expect(matches.map(([node]) => node.type)).toEqual(['bulleted-list', 'bulleted-list']);
    expect(matches.map(([, path]) => path)).toEqual([[0], [0, 0, 1]]);
  });
});

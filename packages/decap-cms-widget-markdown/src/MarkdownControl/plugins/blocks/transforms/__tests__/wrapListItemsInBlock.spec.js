import { createEditor } from 'slate';

import wrapListItemsInBlock from '../wrapListItemsInBlock';

describe('wrapListItemsInBlock', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  it('wraps the selected list items in the given list block', () => {
    const editor = buildEditor(
      [
        { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }] },
        { type: 'list-item', children: [{ type: 'paragraph', children: [{ text: 'item 2' }] }] },
      ],
      {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [1, 0, 0], offset: 6 },
      },
    );

    wrapListItemsInBlock(editor, 'bulleted-list', 'list-item');

    expect(editor.children).toEqual([
      {
        type: 'bulleted-list',
        children: [
          {
            type: 'list-item',
            children: [{ type: 'paragraph', children: [{ text: 'item 1' }] }],
          },
          {
            type: 'list-item',
            children: [{ type: 'paragraph', children: [{ text: 'item 2' }] }],
          },
        ],
      },
    ]);
  });

  it('wraps a single selected list item using the given block type', () => {
    const editor = buildEditor(
      [
        {
          type: 'list-item',
          children: [{ type: 'paragraph', children: [{ text: 'only item' }] }],
        },
      ],
      {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 4 },
      },
    );

    wrapListItemsInBlock(editor, 'numbered-list', 'list-item');

    expect(editor.children).toEqual([
      {
        type: 'numbered-list',
        children: [
          {
            type: 'list-item',
            children: [{ type: 'paragraph', children: [{ text: 'only item' }] }],
          },
        ],
      },
    ]);
  });

  it('returns undefined', () => {
    const editor = buildEditor(
      [
        {
          type: 'list-item',
          children: [{ type: 'paragraph', children: [{ text: 'item' }] }],
        },
      ],
      {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 1 },
      },
    );

    expect(wrapListItemsInBlock(editor, 'bulleted-list', 'list-item')).toBeUndefined();
  });
});

import { createEditor } from 'slate';

import splitIntoParagraph from '../splitIntoParagraph';

describe('splitIntoParagraph', () => {
  function buildEditor(children, selection) {
    const editor = createEditor();
    editor.children = children;
    editor.selection = selection;
    return editor;
  }

  function pointAt(path, offset) {
    return { anchor: { path, offset }, focus: { path, offset } };
  }

  it('splits the node at the cursor and turns the trailing half into a paragraph', () => {
    const editor = buildEditor(
      [{ type: 'heading-one', children: [{ text: 'hello world' }] }],
      pointAt([0, 0], 5),
    );

    splitIntoParagraph(editor);

    expect(editor.children).toEqual([
      { type: 'heading-one', children: [{ text: 'hello' }] },
      { type: 'paragraph', children: [{ text: ' world' }] },
    ]);
  });

  it('leaves the leading half of the split with its original type', () => {
    const editor = buildEditor(
      [
        {
          type: 'block-quote',
          children: [{ type: 'heading-two', children: [{ text: 'quoted text' }] }],
        },
      ],
      pointAt([0, 0, 0], 6),
    );

    splitIntoParagraph(editor);

    expect(editor.children).toEqual([
      {
        type: 'block-quote',
        children: [
          { type: 'heading-two', children: [{ text: 'quoted' }] },
          { type: 'paragraph', children: [{ text: ' text' }] },
        ],
      },
    ]);
  });

  it('deletes an expanded selection before splitting', () => {
    const editor = buildEditor([{ type: 'heading-one', children: [{ text: 'hello world' }] }], {
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 5 },
    });

    splitIntoParagraph(editor);

    expect(editor.children).toEqual([
      { type: 'heading-one', children: [{ text: 'he' }] },
      { type: 'paragraph', children: [{ text: ' world' }] },
    ]);
  });

  it('returns true', () => {
    const editor = buildEditor(
      [{ type: 'paragraph', children: [{ text: 'hello' }] }],
      pointAt([0, 0], 2),
    );

    expect(splitIntoParagraph(editor)).toBe(true);
  });
});

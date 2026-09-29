import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  createEditor,
  type TextNode,
} from 'lexical';
import { describe, expect, it } from 'vitest';

import { getSelectedNode } from './get-selected-node';

type Point = { node: 'first' | 'second'; offset: number };

function selectAndResolve(anchor: Point, focus: Point) {
  const editor = createEditor({ onError: error => { throw error; } });
  let result: { picked: unknown; first: TextNode; second: TextNode } | undefined;

  editor.update(
    () => {
      const first = $createTextNode('abc').toggleFormat('bold');
      const second = $createTextNode('def');
      const paragraph = $createParagraphNode().append(first, second);
      $getRoot().clear().append(paragraph);

      const nodes = { first, second };
      const selection = $createRangeSelection();
      selection.anchor.set(nodes[anchor.node].getKey(), anchor.offset, 'text');
      selection.focus.set(nodes[focus.node].getKey(), focus.offset, 'text');

      result = { picked: getSelectedNode(selection), first, second };
    },
    { discrete: true },
  );

  if (!result) {
    throw new Error('editor update did not run');
  }
  return result;
}

describe('getSelectedNode', () => {
  it('returns the shared node when anchor and focus are in the same node', () => {
    const { picked, first } = selectAndResolve(
      { node: 'first', offset: 0 },
      { node: 'first', offset: 2 },
    );
    expect(picked).toBe(first);
  });

  describe('backward selection', () => {
    it('returns the anchor node when the focus is at the end of its node', () => {
      const { picked, second } = selectAndResolve(
        { node: 'second', offset: 1 },
        { node: 'first', offset: 3 },
      );
      expect(picked).toBe(second);
    });

    it('returns the focus node when the focus is not at the end of its node', () => {
      const { picked, first } = selectAndResolve(
        { node: 'second', offset: 1 },
        { node: 'first', offset: 1 },
      );
      expect(picked).toBe(first);
    });
  });

  describe('forward selection', () => {
    it('returns the anchor node when the anchor is at the end of its node', () => {
      const { picked, first } = selectAndResolve(
        { node: 'first', offset: 3 },
        { node: 'second', offset: 1 },
      );
      expect(picked).toBe(first);
    });

    it('returns the focus node when the anchor is not at the end of its node', () => {
      const { picked, second } = selectAndResolve(
        { node: 'first', offset: 1 },
        { node: 'second', offset: 1 },
      );
      expect(picked).toBe(second);
    });
  });
});

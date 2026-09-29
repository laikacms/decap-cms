import { describe, expect, it } from 'vitest';

import { getDOMRangeRect } from '@/ui/editor/utils/get-dom-range-rect';

function makeRect(top: number): DOMRect {
  return { top, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) };
}

function makeSelection(anchorNode: Node, rangeRect: DOMRect): Selection {
  const range = { getBoundingClientRect: () => rangeRect };
  return { anchorNode, getRangeAt: () => range } as unknown as Selection;
}

describe('getDOMRangeRect', () => {
  it('uses the range rect when the anchor is not the root element', () => {
    const root = document.createElement('div');
    const child = document.createElement('p');
    root.appendChild(child);
    child.getBoundingClientRect = () => makeRect(111);
    const rangeRect = makeRect(42);

    expect(getDOMRangeRect(makeSelection(child, rangeRect), root)).toBe(rangeRect);
  });

  it('uses the deepest first element child rect when the anchor is the root element', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    const span = document.createElement('span');
    const sibling = document.createElement('span');
    root.appendChild(p);
    p.appendChild(span);
    p.appendChild(sibling);
    const deepestRect = makeRect(7);
    root.getBoundingClientRect = () => makeRect(1);
    p.getBoundingClientRect = () => makeRect(2);
    sibling.getBoundingClientRect = () => makeRect(3);
    span.getBoundingClientRect = () => deepestRect;

    expect(getDOMRangeRect(makeSelection(root, makeRect(42)), root)).toBe(deepestRect);
  });

  it('uses the root rect when the root has no element children', () => {
    const root = document.createElement('div');
    const rootRect = makeRect(5);
    root.getBoundingClientRect = () => rootRect;

    expect(getDOMRangeRect(makeSelection(root, makeRect(42)), root)).toBe(rootRect);
  });
});

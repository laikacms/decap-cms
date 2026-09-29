import { beforeEach, describe, expect, it } from 'vitest';

import { setFloatingElemPositionForLinkEditor } from '@/ui/editor/utils/set-floating-elem-position-for-link-editor';

interface Box {
  top?: number;
  left?: number;
  right?: number;
  width?: number;
  height?: number;
}

function makeRect({ top = 0, left = 0, right, width = 0, height = 0 }: Box): DOMRect {
  return {
    top,
    left,
    right: right ?? left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function stubRect(elem: HTMLElement, box: Box) {
  elem.getBoundingClientRect = () => makeRect(box);
}

describe('setFloatingElemPositionForLinkEditor', () => {
  let scroller: HTMLElement;
  let anchor: HTMLElement;
  let floating: HTMLElement;

  beforeEach(() => {
    scroller = document.createElement('div');
    anchor = document.createElement('div');
    floating = document.createElement('div');
    scroller.appendChild(anchor);
    stubRect(scroller, { top: 0, left: 0, width: 1000, height: 1000 });
    stubRect(anchor, { top: 0, left: 0, width: 1000, height: 1000 });
    stubRect(floating, { width: 100, height: 40 });
  });

  it('hides the element offscreen when targetRect is null', () => {
    setFloatingElemPositionForLinkEditor(null, floating, anchor);

    expect(floating.style.opacity).toBe('0');
    expect(floating.style.transform).toBe('translate(-10000px, -10000px)');
  });

  it('hides the element offscreen when the anchor has no parent', () => {
    const orphan = document.createElement('div');

    setFloatingElemPositionForLinkEditor(makeRect({ top: 300, left: 200 }), floating, orphan);

    expect(floating.style.opacity).toBe('0');
    expect(floating.style.transform).toBe('translate(-10000px, -10000px)');
  });

  it('places the element at the target minus the default gap and offset', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 300, left: 200, height: 20 }),
      floating,
      anchor,
    );

    // top = 300 - 10, left = 200 - 5
    expect(floating.style.opacity).toBe('1');
    expect(floating.style.transform).toBe('translate(195px, 290px)');
  });

  it('honours custom verticalGap and horizontalOffset', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 300, left: 200, height: 20 }),
      floating,
      anchor,
      20,
      0,
    );

    expect(floating.style.transform).toBe('translate(200px, 280px)');
  });

  it('flips below the target when above the scroller top', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 5, left: 200, height: 20 }),
      floating,
      anchor,
    );

    // top = 5 - 10 = -5 < 0 -> -5 + 40 + 20 + 10 * 2 = 75
    expect(floating.style.opacity).toBe('1');
    expect(floating.style.transform).toBe('translate(195px, 75px)');
  });

  it('does not flip when top equals the scroller top', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 10, left: 200, height: 20 }),
      floating,
      anchor,
    );

    // top = 10 - 10 = 0, not < 0
    expect(floating.style.transform).toBe('translate(195px, 0px)');
  });

  it('clamps to the right edge of the scroller', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 300, left: 950, height: 20 }),
      floating,
      anchor,
    );

    // 945 + 100 > 1000 -> left = 1000 - 100 - 5 = 895
    expect(floating.style.transform).toBe('translate(895px, 290px)');
  });

  it('does not clamp when the element ends exactly at the right edge', () => {
    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 300, left: 905, height: 20 }),
      floating,
      anchor,
    );

    // 900 + 100 == 1000, not > 1000
    expect(floating.style.transform).toBe('translate(900px, 290px)');
  });

  it('subtracts the anchor rect offset', () => {
    stubRect(anchor, { top: 100, left: 30, width: 900, height: 900 });

    setFloatingElemPositionForLinkEditor(
      makeRect({ top: 300, left: 200, height: 20 }),
      floating,
      anchor,
    );

    // (195 - 30, 290 - 100)
    expect(floating.style.transform).toBe('translate(165px, 190px)');
  });
});

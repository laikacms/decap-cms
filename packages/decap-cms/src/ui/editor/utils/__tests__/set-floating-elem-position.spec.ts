import { beforeEach, describe, expect, it } from 'vitest';

import { setFloatingElemPosition } from '@/ui/editor/utils/set-floating-elem-position';

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

describe('setFloatingElemPosition', () => {
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
    setFloatingElemPosition(null, floating, anchor);

    expect(floating.style.opacity).toBe('0');
    expect(floating.style.transform).toBe('translate(-10000px, -10000px)');
  });

  it('hides the element offscreen when the anchor has no parent', () => {
    const orphan = document.createElement('div');

    setFloatingElemPosition(makeRect({ top: 300, left: 200 }), floating, orphan);

    expect(floating.style.opacity).toBe('0');
    expect(floating.style.transform).toBe('translate(-10000px, -10000px)');
  });

  it('places the element above the target by default', () => {
    setFloatingElemPosition(makeRect({ top: 300, left: 200, height: 20 }), floating, anchor);

    // top = 300 - 40 - 10, left = 200 - 5
    expect(floating.style.opacity).toBe('1');
    expect(floating.style.transform).toBe('translate(195px, 250px)');
  });

  it('honours custom verticalGap and horizontalOffset', () => {
    setFloatingElemPosition(
      makeRect({ top: 300, left: 200, height: 20 }),
      floating,
      anchor,
      false,
      20,
      0,
    );

    expect(floating.style.transform).toBe('translate(200px, 240px)');
  });

  it('flips below the target for non-link when there is no room above', () => {
    setFloatingElemPosition(makeRect({ top: 10, left: 200, height: 20 }), floating, anchor);

    // top = 10 - 40 - 10 = -40 < 0 -> -40 + 40 + 20 + 10 * 2 = 40
    expect(floating.style.opacity).toBe('1');
    expect(floating.style.transform).toBe('translate(195px, 40px)');
  });

  it('flips below with a larger gap multiplier for links', () => {
    setFloatingElemPosition(makeRect({ top: 10, left: 200, height: 20 }), floating, anchor, true);

    // -40 + 40 + 20 + 10 * 9 = 110
    expect(floating.style.transform).toBe('translate(195px, 110px)');
  });

  it('does not flip when top equals the scroller top', () => {
    setFloatingElemPosition(makeRect({ top: 50, left: 200, height: 20 }), floating, anchor);

    // top = 50 - 40 - 10 = 0, not < 0
    expect(floating.style.transform).toBe('translate(195px, 0px)');
  });

  it('clamps to the right edge of the scroller', () => {
    setFloatingElemPosition(makeRect({ top: 300, left: 950, height: 20 }), floating, anchor);

    // 945 + 100 > 1000 -> left = 1000 - 100 - 5 = 895
    expect(floating.style.transform).toBe('translate(895px, 250px)');
  });

  it('does not clamp when the element ends exactly at the right edge', () => {
    setFloatingElemPosition(makeRect({ top: 300, left: 905, height: 20 }), floating, anchor);

    // 900 + 100 == 1000, not > 1000
    expect(floating.style.transform).toBe('translate(900px, 250px)');
  });

  it('subtracts the anchor rect offset', () => {
    stubRect(anchor, { top: 100, left: 30, width: 900, height: 900 });

    setFloatingElemPosition(makeRect({ top: 300, left: 200, height: 20 }), floating, anchor);

    // (195 - 30, 250 - 100)
    expect(floating.style.transform).toBe('translate(165px, 150px)');
  });
});

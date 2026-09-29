import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addSwipeDownListener,
  addSwipeLeftListener,
  addSwipeRightListener,
  addSwipeUpListener,
} from '@/ui/editor/utils/swipe';

function touch(element: HTMLElement, type: 'touchstart' | 'touchend', x: number, y: number) {
  const event = new Event(type, { bubbles: true }) as Event & { changedTouches: unknown[] };
  event.changedTouches = [{ clientX: x, clientY: y }];
  element.dispatchEvent(event);
}

function swipe(element: HTMLElement, dx: number, dy: number) {
  touch(element, 'touchstart', 100, 100);
  touch(element, 'touchend', 100 + dx, 100 + dy);
}

describe('swipe listeners', () => {
  let element: HTMLElement;
  const unsubscribers: Array<() => void> = [];

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
    element.remove();
  });

  const directions = [
    { name: 'left', add: addSwipeLeftListener, hit: [-80, 5], wrong: [80, 5] },
    { name: 'right', add: addSwipeRightListener, hit: [80, 5], wrong: [-80, 5] },
    { name: 'up', add: addSwipeUpListener, hit: [5, -80], wrong: [5, 80] },
    { name: 'down', add: addSwipeDownListener, hit: [5, 80], wrong: [5, -80] },
  ] as const;

  describe.each(directions)('swipe $name', ({ add, hit, wrong }) => {
    it('fires the callback on a swipe in its direction', () => {
      const cb = vi.fn();
      unsubscribers.push(add(element, cb));
      swipe(element, hit[0], hit[1]);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not fire on a swipe in the opposite direction', () => {
      const cb = vi.fn();
      unsubscribers.push(add(element, cb));
      swipe(element, wrong[0], wrong[1]);
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not fire when the perpendicular axis dominates', () => {
      const cb = vi.fn();
      unsubscribers.push(add(element, cb));
      swipe(element, hit[0] === 5 ? 80 : 0, hit[1] === 5 ? 80 : 0);
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not fire when the movement is equal on both axes', () => {
      const cb = vi.fn();
      unsubscribers.push(add(element, cb));
      swipe(element, Math.sign(hit[0]) * 50, Math.sign(hit[1]) * 50);
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not fire when there is no movement', () => {
      const cb = vi.fn();
      unsubscribers.push(add(element, cb));
      swipe(element, 0, 0);
      expect(cb).not.toHaveBeenCalled();
    });

    it('stops firing after the returned unsubscribe function is called', () => {
      const cb = vi.fn();
      const unsubscribe = add(element, cb);
      swipe(element, hit[0], hit[1]);
      expect(cb).toHaveBeenCalledTimes(1);
      unsubscribe();
      swipe(element, hit[0], hit[1]);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  it('passes the touchend event to the callback', () => {
    const cb = vi.fn();
    unsubscribers.push(addSwipeLeftListener(element, cb));
    swipe(element, -80, 0);
    expect(cb).toHaveBeenCalledWith(-80, expect.objectContaining({ type: 'touchend' }));
  });

  it('passes the signed horizontal distance for left and right swipes', () => {
    const left = vi.fn();
    const right = vi.fn();
    unsubscribers.push(addSwipeLeftListener(element, left), addSwipeRightListener(element, right));
    swipe(element, -60, 10);
    swipe(element, 70, -10);
    expect(left).toHaveBeenCalledWith(-60, expect.anything());
    expect(right).toHaveBeenCalledWith(70, expect.anything());
  });

  it('ignores touchend without a preceding touchstart', () => {
    const cb = vi.fn();
    unsubscribers.push(addSwipeLeftListener(element, cb));
    touch(element, 'touchend', 0, 0);
    expect(cb).not.toHaveBeenCalled();
  });

  it('ignores touchend events that carry no touches', () => {
    const cb = vi.fn();
    unsubscribers.push(addSwipeLeftListener(element, cb));
    touch(element, 'touchstart', 100, 100);
    const event = new Event('touchend') as Event & { changedTouches: unknown[] };
    event.changedTouches = [];
    element.dispatchEvent(event);
    expect(cb).not.toHaveBeenCalled();
  });

  it('keeps other listeners on the same element active after one unsubscribes', () => {
    const left = vi.fn();
    const right = vi.fn();
    const unsubscribeLeft = addSwipeLeftListener(element, left);
    unsubscribers.push(addSwipeRightListener(element, right));
    unsubscribeLeft();
    swipe(element, 80, 0);
    swipe(element, -80, 0);
    expect(right).toHaveBeenCalledTimes(1);
    expect(left).not.toHaveBeenCalled();
  });

  it('supports re-subscribing after all listeners were removed', () => {
    const cb = vi.fn();
    addSwipeLeftListener(element, vi.fn())();
    unsubscribers.push(addSwipeLeftListener(element, cb));
    swipe(element, -80, 0);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('removes the DOM listeners once the last subscriber is gone', () => {
    const removeSpy = vi.spyOn(element, 'removeEventListener');
    addSwipeLeftListener(element, vi.fn())();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('documents current behavior: up/down callbacks receive the horizontal delta', () => {
    const up = vi.fn();
    const down = vi.fn();
    unsubscribers.push(addSwipeUpListener(element, up), addSwipeDownListener(element, down));
    swipe(element, 7, -80);
    swipe(element, 9, 80);
    expect(up).toHaveBeenCalledWith(7, expect.anything());
    expect(down).toHaveBeenCalledWith(9, expect.anything());
  });
});

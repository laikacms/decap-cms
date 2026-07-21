import { getCoords } from '../DropDown/getCoords';

function rect({ x = 0, y = 0, width = 0, height = 0 } = {}) {
  return { x, y, width, height };
}

describe('getCoords', () => {
  it('positions the dropdown below the reference element by default', () => {
    const reference = rect({ x: 100, y: 50, width: 200, height: 40 });
    const target = rect({ width: 100, height: 60 });
    const viewport = rect({ width: 800, height: 600 });

    expect(getCoords({ reference, target, viewport, dropdownPosition: undefined })).toEqual({
      x: 50,
      y: 40,
    });
  });

  it('aligns the dropdown to the left of the reference element', () => {
    const reference = rect({ x: 100, y: 50, width: 200, height: 40 });
    const target = rect({ width: 100, height: 60 });
    const viewport = rect({ width: 800, height: 600 });

    expect(getCoords({ reference, target, viewport, dropdownPosition: 'left' })).toEqual({
      x: 0,
      y: 40,
    });
  });

  it('aligns the dropdown to the right of the reference element', () => {
    const reference = rect({ x: 100, y: 50, width: 200, height: 40 });
    const target = rect({ width: 100, height: 60 });
    const viewport = rect({ width: 800, height: 600 });

    expect(getCoords({ reference, target, viewport, dropdownPosition: 'right' })).toEqual({
      x: 100,
      y: 40,
    });
  });

  it('falls back to the default (centered) placement for dropdownPosition "center"', () => {
    const reference = rect({ x: 100, y: 50, width: 200, height: 40 });
    const target = rect({ width: 100, height: 60 });
    const viewport = rect({ width: 800, height: 600 });

    const centered = getCoords({ reference, target, viewport, dropdownPosition: 'center' });
    const defaulted = getCoords({ reference, target, viewport, dropdownPosition: undefined });

    expect(centered).toEqual(defaulted);
    expect(centered).toEqual({ x: 50, y: 40 });
  });

  it('pulls the dropdown back in bounds when it would overflow the right edge of the viewport', () => {
    const reference = rect({ x: 700, y: 50, width: 200, height: 40 });
    const target = rect({ width: 150, height: 60 });
    const viewport = rect({ width: 800, height: 600 });

    // Unconstrained placement would put the dropdown's left edge at x=725,
    // so its right edge (725 + 150 = 875) overflows the 800-wide viewport.
    const result = getCoords({ reference, target, viewport, dropdownPosition: undefined });

    expect(result).toEqual({ x: -50, y: 40 });

    // Confirm the clamp actually pulled it back in bounds: converting back to
    // absolute coordinates, the target's right edge must not exceed the viewport.
    const absoluteX = result.x + reference.x;
    expect(absoluteX + target.width).toBeLessThanOrEqual(viewport.width);
    expect(absoluteX).toBeLessThan(725);
  });

  it('returns coordinates relative to the reference element, not absolute viewport coordinates', () => {
    const target = rect({ width: 100, height: 60 });
    const viewport = rect({ width: 1000, height: 600 });

    const nearOrigin = getCoords({
      reference: rect({ x: 50, y: 20, width: 200, height: 40 }),
      target,
      viewport,
      dropdownPosition: undefined,
    });
    const farFromOrigin = getCoords({
      reference: rect({ x: 400, y: 20, width: 200, height: 40 }),
      target,
      viewport,
      dropdownPosition: undefined,
    });

    // Same reference size/target/position relative to the reference element,
    // just shifted in absolute space: relative output should be identical.
    expect(nearOrigin).toEqual({ x: 50, y: 40 });
    expect(farFromOrigin).toEqual({ x: 50, y: 40 });
    expect(nearOrigin).toEqual(farFromOrigin);
  });
});

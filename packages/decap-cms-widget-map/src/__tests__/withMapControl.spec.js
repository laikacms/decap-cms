import React from 'react';
import { render } from '@testing-library/react';
import { Map } from 'immutable';

// `withMapControl.js` unconditionally imports the `ol` (OpenLayers) ESM
// package for its default map/format implementations, even though these
// tests inject their own `getMap`/`getFormat`. `ol`'s ESM sources aren't
// transformed by the repo's jest config, so stub them out.
jest.mock('ol/Map.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/View.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/format/GeoJSON', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/interaction/Draw.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));
jest.mock('ol/layer/Tile.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/layer/Vector.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/source/OSM.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('ol/source/Vector.js', () => ({ __esModule: true, default: jest.fn() }));

import withMapControl from '../withMapControl';

// jsdom has no ResizeObserver and never lays elements out, so tests drive the
// widget's ResizeObserver callback directly to simulate the container gaining
// real dimensions after mount (e.g. once layout settles, or once a parent
// object/list field expands from `collapsed: true`).
let observedTarget;
let resizeCallback;

class MockResizeObserver {
  constructor(callback) {
    resizeCallback = callback;
  }
  observe(target) {
    observedTarget = target;
  }
  disconnect() {}
}

function setContainerSize(target, { width, height }) {
  Object.defineProperty(target, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(target, 'offsetHeight', { configurable: true, value: height });
}

function fireResize() {
  resizeCallback([{ target: observedTarget }]);
}

describe('withMapControl', () => {
  let getMap;
  let map;
  let MapControl;

  beforeEach(() => {
    global.ResizeObserver = MockResizeObserver;
    observedTarget = undefined;
    resizeCallback = undefined;

    map = {
      getView: jest.fn().mockReturnValue({ fit: jest.fn() }),
      addInteraction: jest.fn(),
      updateSize: jest.fn(),
      setTarget: jest.fn(),
    };
    getMap = jest.fn().mockReturnValue(map);

    MapControl = withMapControl({
      getFormat: () => ({ readFeature: jest.fn(), writeGeometry: jest.fn() }),
      getMap,
    });
  });

  afterEach(() => {
    delete global.ResizeObserver;
  });

  function renderControl() {
    const field = Map({ name: 'map', widget: 'map' });
    return render(
      <MapControl field={field} onChange={jest.fn()} value="" classNameWrapper="control" />,
    );
  }

  it('does not construct the map while the container is 0x0 at mount', () => {
    renderControl();

    expect(getMap).not.toHaveBeenCalled();
  });

  it('constructs the map once the container reports non-zero size after mount', () => {
    renderControl();
    setContainerSize(observedTarget, { width: 300, height: 400 });

    fireResize();

    expect(getMap).toHaveBeenCalledTimes(1);
  });

  it('constructs the map once a collapsed parent expands and the container gains size', () => {
    // Simulates a map widget nested in a `collapsed: true` object field: the
    // container stays 0x0 until the object expands and the ResizeObserver
    // reports the container's new, non-zero dimensions.
    renderControl();

    setContainerSize(observedTarget, { width: 0, height: 0 });
    fireResize();
    expect(getMap).not.toHaveBeenCalled();

    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();
    expect(getMap).toHaveBeenCalledTimes(1);
  });

  it('calls updateSize on the already-constructed map for subsequent resizes instead of reconstructing it', () => {
    renderControl();
    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();
    expect(getMap).toHaveBeenCalledTimes(1);

    setContainerSize(observedTarget, { width: 500, height: 600 });
    fireResize();

    expect(getMap).toHaveBeenCalledTimes(1);
    expect(map.updateSize).toHaveBeenCalledTimes(1);
  });

  it('constructs the map immediately when the container already has size at mount', () => {
    let target;
    class ImmediateSizeResizeObserver extends MockResizeObserver {
      observe(t) {
        target = t;
        setContainerSize(target, { width: 300, height: 400 });
        super.observe(t);
      }
    }
    global.ResizeObserver = ImmediateSizeResizeObserver;

    renderControl();

    expect(getMap).toHaveBeenCalledTimes(1);
  });

  it('releases the map and stops observing on unmount', () => {
    const { unmount } = renderControl();
    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();
    expect(getMap).toHaveBeenCalledTimes(1);

    const disconnectSpy = jest.spyOn(MockResizeObserver.prototype, 'disconnect');

    unmount();

    expect(map.setTarget).toHaveBeenCalledWith(null);
    expect(disconnectSpy).toHaveBeenCalled();
  });
});

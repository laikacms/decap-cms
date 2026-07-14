import React from 'react';
import { render } from '@testing-library/react';
import { Map } from 'immutable';
import Draw from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';

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
    Draw.mockClear();
    VectorSource.mockReset();

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

  function renderControl(fieldOverrides = {}) {
    const field = Map({ name: 'map', widget: 'map', ...fieldOverrides });
    return render(
      <MapControl field={field} onChange={jest.fn()} value="" classNameWrapper="control" />,
    );
  }

  it('defaults the container height to 400px when the field has no height option', () => {
    const { container } = renderControl();

    expect(container.querySelector('.control')).toHaveStyle({ height: '400px' });
  });

  it('reads the container height from the field height option', () => {
    const { container } = renderControl({ height: '600px' });

    expect(container.querySelector('.control')).toHaveStyle({ height: '600px' });
  });

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

  it('writes the drawn geometry back through onChange using the field decimals option', () => {
    const writeGeometry = jest.fn().mockReturnValue('written-geometry');
    VectorSource.mockImplementation(() => ({ clear: jest.fn() }));
    MapControl = withMapControl({
      getFormat: () => ({ readFeature: jest.fn(), writeGeometry }),
      getMap,
    });

    const onChange = jest.fn();
    const field = Map({ name: 'map', widget: 'map', decimals: 3 });
    render(<MapControl field={field} onChange={onChange} value="" classNameWrapper="control" />);

    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();

    const drawInstance = Draw.mock.results[0].value;
    const geometry = { fake: 'geometry' };
    const drawendHandler = drawInstance.on.mock.calls.find(([event]) => event === 'drawend')[1];

    drawendHandler({ feature: { getGeometry: () => geometry } });

    expect(writeGeometry).toHaveBeenCalledWith(geometry, { decimals: 3 });
    expect(onChange).toHaveBeenCalledWith('written-geometry');
  });

  it('constructs Draw with the type option from the field', () => {
    renderControl({ type: 'Polygon' });
    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();

    expect(Draw).toHaveBeenCalledWith(expect.objectContaining({ type: 'Polygon' }));
  });

  it('defaults the Draw type to Point when the field has no type option', () => {
    renderControl();
    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();

    expect(Draw).toHaveBeenCalledWith(expect.objectContaining({ type: 'Point' }));
  });

  it('loads a pre-existing field value onto the map on mount', () => {
    const feature = { fake: 'feature' };
    const readFeature = jest.fn().mockReturnValue(feature);
    const extent = [0, 0, 1, 1];
    VectorSource.mockImplementation(() => ({ getExtent: jest.fn().mockReturnValue(extent) }));

    MapControl = withMapControl({
      getFormat: () => ({ readFeature, writeGeometry: jest.fn() }),
      getMap,
    });

    const field = Map({ name: 'map', widget: 'map' });
    const value = '{"type":"Point","coordinates":[1,2]}';
    render(
      <MapControl field={field} onChange={jest.fn()} value={value} classNameWrapper="control" />,
    );

    expect(readFeature).toHaveBeenCalledWith(value);

    setContainerSize(observedTarget, { width: 300, height: 400 });
    fireResize();

    expect(map.getView().fit).toHaveBeenCalledWith(extent, {
      maxZoom: 16,
      padding: [80, 80, 80, 80],
    });
  });
});

import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import withMapControl from '../withMapControl';

// Mirrors the real OpenLayers behavior this test is guarding against: OL's
// internal `hasArea()` probe runs synchronously on `new Map({ target })` and
// warns when the target has zero width/height (DCMS-302 / DCMS-418).
const OL_ZERO_SIZE_WARNING = "No map visible because the map container's width or height are 0.";

const mapConstructorSpy = vi.fn();

vi.mock('ol/Map.js', () => ({
  default: vi.fn().mockImplementation(function(this: any, opts: any) {
    mapConstructorSpy(opts);
    if (!opts.target || opts.target.offsetWidth === 0 || opts.target.offsetHeight === 0) {
      console.warn(OL_ZERO_SIZE_WARNING);
    }
    this.getView = vi.fn(() => ({ fit: vi.fn() }));
    this.addInteraction = vi.fn();
    this.updateSize = vi.fn();
    return this;
  }),
}));

vi.mock('ol/View.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    return this;
  }),
}));

vi.mock('ol/format/GeoJSON', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    this.readFeature = vi.fn(() => ({}));
    this.writeGeometry = vi.fn(() => '{}');
    return this;
  }),
}));

vi.mock('ol/interaction/Draw.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    this.on = vi.fn();
    return this;
  }),
}));

vi.mock('ol/layer/Tile.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    return this;
  }),
}));

vi.mock('ol/layer/Vector.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    this.getSource = vi.fn();
    return this;
  }),
}));

vi.mock('ol/source/OSM.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    return this;
  }),
}));

vi.mock('ol/source/Vector.js', () => ({
  default: vi.fn().mockImplementation(function(this: any) {
    this.getExtent = vi.fn();
    return this;
  }),
}));

vi.mock('ol/ol.css?inline', () => ({ default: '' }));

let resizeObserverCallback: (() => void) | undefined;
let resizeObserverDisconnect: ReturnType<typeof vi.fn>;

class MockResizeObserver {
  observe = vi.fn();
  disconnect = resizeObserverDisconnect;

  constructor(cb: () => void) {
    resizeObserverCallback = cb;
  }
}

let rafCallbacks: FrameRequestCallback[];

function flushRaf() {
  const callbacks = rafCallbacks.splice(0);
  callbacks.forEach(cb => cb(0));
}

const MapControl = withMapControl();

function setup(propsOverrides: Record<string, unknown> = {}) {
  const props = {
    field: { type: 'Point' },
    onChange: vi.fn(),
    value: '',
    height: '400px',
    classNameWrapper: 'classNameWrapper',
    t: (key: string) => key,
    ...propsOverrides,
  };

  const utils = render(<MapControl {...(props as any)} />);
  const target = utils.container.firstChild as HTMLElement;

  return { ...utils, props, target };
}

function setLayout(target: HTMLElement, width: number, height: number) {
  Object.defineProperty(target, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(target, 'offsetHeight', { value: height, configurable: true });
}

describe('withMapControl', () => {
  beforeEach(() => {
    mapConstructorSpy.mockClear();
    resizeObserverCallback = undefined;
    resizeObserverDisconnect = vi.fn();
    rafCallbacks = [];

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('does not construct the OL Map while the container has zero layout', () => {
    setup();

    // jsdom reports 0x0 by default; the ResizeObserver firing at that size
    // must not trigger construction.
    resizeObserverCallback?.();

    expect(mapConstructorSpy).not.toHaveBeenCalled();
  });

  test('constructs the OL Map only after the container reports non-zero width and height', () => {
    const { target } = setup();

    resizeObserverCallback?.();
    expect(mapConstructorSpy).not.toHaveBeenCalled();

    setLayout(target, 300, 400);
    resizeObserverCallback?.();

    expect(mapConstructorSpy).toHaveBeenCalledTimes(1);
    expect(mapConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        target,
      }),
    );
  });

  test('falls back to initializing via requestAnimationFrame if the ResizeObserver never reports a size', () => {
    const { target } = setup();

    setLayout(target, 300, 400);
    // No resize-observer callback fired; only the mount-time rAF fallback runs.
    flushRaf();

    expect(mapConstructorSpy).toHaveBeenCalledTimes(1);
  });

  test('re-checks hasLayout() before constructing when the rAF fallback fires while the container is still 0x0', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { target } = setup();

    // jsdom reports 0x0 at mount, so the fallback rAF is scheduled. Flush it
    // while the container is still 0x0 (route-transition timing): it must
    // re-check hasLayout(), skip construction, and reschedule instead of
    // building an undersized map.
    flushRaf();
    expect(mapConstructorSpy).not.toHaveBeenCalled();

    setLayout(target, 300, 400);
    // The rescheduled rAF fires now that the container has real layout.
    flushRaf();

    expect(mapConstructorSpy).toHaveBeenCalledTimes(1);
    expect(mapConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        target,
      }),
    );

    const zeroSizeWarnings = warnSpy.mock.calls.filter(args => /No map visible.*width or height/.test(String(args[0])));
    expect(zeroSizeWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });

  test('never logs the OpenLayers 0x0 container warning during the mount -> resize sequence', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { target } = setup();

    resizeObserverCallback?.();
    setLayout(target, 300, 400);
    resizeObserverCallback?.();
    flushRaf();

    const zeroSizeWarnings = warnSpy.mock.calls.filter(args => /No map visible.*width or height/.test(String(args[0])));
    expect(zeroSizeWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });

  test('disconnects the ResizeObserver on unmount', () => {
    const { unmount } = setup();

    unmount();

    expect(resizeObserverDisconnect).toHaveBeenCalledTimes(1);
  });

  // DCMS-430: DCMS-428's hasLayout() re-check inside the rAF fallback still
  // let a cold deep-link into the demo app (React running in dev
  // mode, StrictMode double-invoking the mount effect) construct the OL Map
  // twice, warning twice. Render under React.StrictMode - which double-invokes
  // mount effects in dev builds - and assert the OL Map is constructed exactly
  // once across the double-invoke cycle, against a non-zero target, with no
  // 0x0 warnings. This fails against the pre-fix code (separate synchronous
  // `if (hasLayout()) initMap()` branch, no `disposed` guard).
  test('constructs the OL Map exactly once when rendered under React.StrictMode (double-invoked mount effect)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const props = {
      field: { type: 'Point' },
      onChange: vi.fn(),
      value: '',
      height: '400px',
      classNameWrapper: 'classNameWrapper',
      t: (key: string) => key,
    };

    const utils = render(
      <React.StrictMode>
        <MapControl {...(props as any)} />
      </React.StrictMode>,
    );
    const target = utils.container.firstChild as HTMLElement;

    setLayout(target, 300, 400);
    resizeObserverCallback?.();
    flushRaf();

    expect(mapConstructorSpy).toHaveBeenCalledTimes(1);
    expect(mapConstructorSpy).toHaveBeenCalledWith(expect.objectContaining({ target }));

    const zeroSizeWarnings = warnSpy.mock.calls.filter(args => /No map visible.*width or height/.test(String(args[0])));
    expect(zeroSizeWarnings).toHaveLength(0);

    warnSpy.mockRestore();
  });
});

// DCMS-1086: PR #1085 wired aria-invalid/aria-required/aria-errormessage
// into string/text/number/colorstring/datetime/select/richtext, but missed
// this widget - it had no queryable input surface at all, so the
// "focus first invalid control" heuristic had nowhere to land. Applied to
// the leaflet/OpenLayers container div (role="application"), which is now
// also given a stable id from `forID`.
describe('MapControl aria validation wiring (DCMS-1086)', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    resizeObserverDisconnect = vi.fn();
    rafCallbacks = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // DCMS-1389: `role="application"` does not allow `aria-required` (ARIA
  // 1.3 aria-allowed-attr), so the container never carries it; required-ness
  // is instead conveyed via a suffix on the accessible name (`aria-label`).
  test('never sets aria-required on the application container, even when required', () => {
    const { target } = setup({ forID: 'location-field-1' });
    expect(target).not.toHaveAttribute('aria-required');
    expect(target).toHaveAttribute('role', 'application');
    expect(target).toHaveAttribute('id', 'location-field-1');
  });

  test('conveys required-ness through the accessible name by default', () => {
    const { target } = setup({ field: { type: 'Point', name: 'location' } });
    expect(target).toHaveAttribute(
      'aria-label',
      'location (editor.editorControl.field.required)',
    );
  });

  test('omits the required accessible-name cue when the field is optional', () => {
    const { target } = setup({ field: { type: 'Point', name: 'location', required: false } });
    expect(target).toHaveAttribute('aria-label', 'location');
  });

  test('has no aria-invalid when the field has no errors', () => {
    const { target } = setup();
    expect(target).not.toHaveAttribute('aria-invalid');
  });

  test('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { target } = setup({ hasErrors: true, errorListId: 'location-field-1-errors' });
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(target).toHaveAttribute('aria-errormessage', 'location-field-1-errors');
  });
});

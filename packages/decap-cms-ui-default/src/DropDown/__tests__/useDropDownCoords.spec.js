// jsdom has no ResizeObserver, so tests drive the module's shared observer
// directly to simulate viewport changes, following the pattern in
// packages/decap-cms-widget-map/src/__tests__/withMapControl.spec.js.
class MockResizeObserver {
  constructor(callback) {
    MockResizeObserver.instances.push(this);
    this.callback = callback;
    this.disconnected = false;
  }
  observe(target) {
    this.target = target;
  }
  disconnect() {
    this.disconnected = true;
  }
}
MockResizeObserver.instances = [];

function fireResize(rect) {
  const [observer] = MockResizeObserver.instances;
  observer.callback([{ contentRect: rect }]);
}

describe('useDropDownCoords viewport subscription', () => {
  let subscribeToViewportRect;

  beforeEach(() => {
    // The module keeps a singleton `viewportState` (callbacks map + cached
    // observer/viewport) at module scope, so each test needs a fresh module
    // instance to avoid leaking subscribers/observers between test cases.
    jest.resetModules();
    jest.useFakeTimers();
    MockResizeObserver.instances = [];
    global.ResizeObserver = MockResizeObserver;
    ({ subscribeToViewportRect } = require('../useDropDownCoords'));
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.ResizeObserver;
  });

  it('invokes the callback immediately with the current viewport, then again on subsequent viewport changes', () => {
    const calls = [];
    const unsubscribe = subscribeToViewportRect(rect => calls.push(rect));

    // No resize has happened yet, so the "current" viewport is still unset,
    // but the callback must still fire synchronously on subscribe.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeUndefined();

    fireResize({ width: 100, height: 200 });
    jest.advanceTimersByTime(20);

    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ width: 100, height: 200 });

    fireResize({ width: 300, height: 400 });
    jest.advanceTimersByTime(20);

    expect(calls).toHaveLength(3);
    expect(calls[2]).toEqual({ width: 300, height: 400 });

    unsubscribe();
  });

  it('immediately hands a newly-registered subscriber the already-known viewport rather than waiting for the next resize', () => {
    const first = subscribeToViewportRect(() => {});

    fireResize({ width: 640, height: 480 });
    jest.advanceTimersByTime(20);

    const laterCalls = [];
    subscribeToViewportRect(rect => laterCalls.push(rect));

    expect(laterCalls).toHaveLength(1);
    expect(laterCalls[0]).toEqual({ width: 640, height: 480 });

    first();
  });

  it('creates the shared ResizeObserver once and reuses it across multiple subscribers', () => {
    const unsubscribeA = subscribeToViewportRect(() => {});
    const unsubscribeB = subscribeToViewportRect(() => {});
    const unsubscribeC = subscribeToViewportRect(() => {});

    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].target).toBe(document.documentElement);

    unsubscribeA();
    unsubscribeB();
    unsubscribeC();
  });

  it('notifies every active subscriber on a single resize, sharing the one observer', () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const unsubscribeA = subscribeToViewportRect(callbackA);
    const unsubscribeB = subscribeToViewportRect(callbackB);

    callbackA.mockClear();
    callbackB.mockClear();

    fireResize({ width: 50, height: 60 });
    jest.advanceTimersByTime(20);

    expect(callbackA).toHaveBeenCalledTimes(1);
    expect(callbackA).toHaveBeenCalledWith({ width: 50, height: 60 });
    expect(callbackB).toHaveBeenCalledTimes(1);
    expect(callbackB).toHaveBeenCalledWith({ width: 50, height: 60 });

    unsubscribeA();
    unsubscribeB();
  });

  it('removes only its own callback on unsubscribe, leaving other subscribers active', () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const unsubscribeA = subscribeToViewportRect(callbackA);
    const unsubscribeB = subscribeToViewportRect(callbackB);

    callbackA.mockClear();
    callbackB.mockClear();

    unsubscribeA();

    fireResize({ width: 10, height: 20 });
    jest.advanceTimersByTime(20);

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledTimes(1);
    expect(callbackB).toHaveBeenCalledWith({ width: 10, height: 20 });

    unsubscribeB();
  });

  it('does not disconnect the observer while other subscribers remain', () => {
    const unsubscribeA = subscribeToViewportRect(() => {});
    const unsubscribeB = subscribeToViewportRect(() => {});

    unsubscribeA();

    expect(MockResizeObserver.instances[0].disconnected).toBe(false);

    unsubscribeB();
  });

  it('disconnects the observer once the last subscriber unregisters', () => {
    const unsubscribeA = subscribeToViewportRect(() => {});
    const unsubscribeB = subscribeToViewportRect(() => {});

    unsubscribeA();
    unsubscribeB();

    expect(MockResizeObserver.instances[0].disconnected).toBe(true);
  });

  it('creates a new observer if a subscriber registers again after the previous observer was disconnected', () => {
    const unsubscribeA = subscribeToViewportRect(() => {});
    unsubscribeA();

    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].disconnected).toBe(true);

    const unsubscribeB = subscribeToViewportRect(() => {});

    expect(MockResizeObserver.instances).toHaveLength(2);
    expect(MockResizeObserver.instances[1].disconnected).toBe(false);

    unsubscribeB();
  });
});

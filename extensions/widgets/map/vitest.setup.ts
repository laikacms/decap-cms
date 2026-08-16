import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend(matchers);

// With `globals: false`, @testing-library/react cannot auto-register its
// afterEach(cleanup) hook, so rendered DOM would leak between tests.
afterEach(() => {
  cleanup();
});

// jsdom does not implement ResizeObserver, which the map control uses to defer
// OpenLayers construction until its container has a non-zero size.
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver ??= MockResizeObserver;

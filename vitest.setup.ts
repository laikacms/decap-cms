import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend(matchers);

// With `globals: false`, @testing-library/react cannot auto-register its
// afterEach(cleanup) hook (it relies on a global afterEach), so rendered DOM
// would leak between tests. Register cleanup explicitly.
afterEach(() => {
  cleanup();
});

// Mock path module to use posix paths
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual.posix,
    default: actual.posix,
  };
});

// Modern Node provides a global `fetch`; the previous `node-fetch` shim is no
// longer needed after the monorepo flatten dropped node-fetch as a root dep.

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn();

// jsdom does not implement ResizeObserver.
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver ??= MockResizeObserver;

// jsdom does not implement IntersectionObserver.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
globalThis.IntersectionObserver ??= MockIntersectionObserver as unknown as typeof IntersectionObserver;


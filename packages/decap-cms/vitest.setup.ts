import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

import type * as NodePath from 'path';

expect.extend(matchers);

// With `globals: false`, @testing-library/react cannot auto-register its
// afterEach(cleanup) hook (it relies on a global afterEach), so rendered DOM
// would leak between tests. Register cleanup explicitly.
afterEach(() => {
  cleanup();
});

// Mock path module to use posix paths
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof NodePath>('path');
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

// jsdom's Range lacks getClientRects; Lexical's selection code calls it from
// a MutationObserver after document edits, crashing as an unhandled error
// outside any test. Layout is meaningless in jsdom, so empty rects suffice.
// (Deliberately NOT stubbing Range#getBoundingClientRect: some Lexical
// positioning code spins forever when it returns all-zero rects.)
if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects ??= () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: [][Symbol.iterator],
    }) as unknown as DOMRectList;
}

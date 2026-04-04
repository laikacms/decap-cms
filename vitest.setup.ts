import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide Jest compatibility - expose jest global that maps to vi
// This allows tests using jest.fn(), jest.mock(), etc. to work
// @ts-expect-error - Adding jest global for compatibility
globalThis.jest = vi;

// Mock path module to use posix paths
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual.posix,
    default: actual.posix,
  };
});

// Mock fetch
import fetch from 'node-fetch';
// @ts-expect-error - node-fetch types don't match exactly
globalThis.fetch = fetch;

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn();

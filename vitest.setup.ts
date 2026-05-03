import '@testing-library/jest-dom';
import { vi } from 'vitest';

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


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

// Modern Node provides a global `fetch`; the previous `node-fetch` shim is no
// longer needed after the monorepo flatten dropped node-fetch as a root dep.

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn();


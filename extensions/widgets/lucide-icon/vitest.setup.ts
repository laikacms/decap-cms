import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

// With `globals: false`, @testing-library/react cannot auto-register its
// afterEach(cleanup) hook, so rendered DOM would leak between tests.
afterEach(() => {
  cleanup();
});

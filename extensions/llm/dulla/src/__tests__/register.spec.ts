// @vitest-environment jsdom
//
// `register.ts` imports `@laikacms/decap-cms/core`, whose module graph
// eagerly touches `window`/`localStorage` (e.g. building a default
// `AssetProxy`); this file needs a DOM even though the rest of this
// node-environment package does not.
import { Registry } from '@laikacms/decap-cms/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as dullaTransportModule from '../dullaTransport';
import { registerDulla } from '../register';

describe('registerDulla', () => {
  afterEach(() => {
    Registry.unregisterLlmTransport();
    vi.restoreAllMocks();
  });

  it('passes its options to createDullaTransport and registers the result on Registry', () => {
    const spy = vi.spyOn(dullaTransportModule, 'createDullaTransport');
    const options = { apiBasePath: '/custom/ai' };

    expect(Registry.getLlmTransport()).toBeUndefined();

    registerDulla(options);

    expect(spy).toHaveBeenCalledWith(options);

    const transport = Registry.getLlmTransport();
    expect(transport).toBeDefined();
    expect(typeof transport?.openSession).toBe('function');
  });

  it('is idempotent, so multiple entry points may call it', () => {
    // `register.ts`'s module-level guard was already tripped by the previous
    // test (it is not reset between tests, on purpose — this is exactly the
    // "second entry point calls it too" scenario the guard exists for), so
    // this call must be a no-op: no throw, and no re-registration.
    const spy = vi.spyOn(dullaTransportModule, 'createDullaTransport');

    expect(() => registerDulla()).not.toThrow();

    expect(spy).not.toHaveBeenCalled();
  });
});

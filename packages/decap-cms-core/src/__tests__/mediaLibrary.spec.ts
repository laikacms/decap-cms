/**
 * End-to-end-ish check that the media library integration point resolves
 * `{ credential: 'name' }` references (kept out of the public config.yml)
 * before handing config to a registered media library's `init`, using the
 * real store/registry/credentials wiring rather than mocking them away.
 */
import { store } from '../redux';
import { registerMediaLibrary } from '../lib/registry';
import { configLoaded } from '../actions/config';
import { authenticate } from '../actions/auth';
import { currentBackend } from '../backend';

import type { CmsConfig } from '../types/redux';

jest.mock('../backend', () => {
  const actual = jest.requireActual('../backend');
  return {
    ...actual,
    currentBackend: jest.fn(),
  };
});

const mockCurrentBackend = currentBackend as jest.MockedFunction<typeof currentBackend>;

describe('mediaLibrary registry init (credential resolution)', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('resolves a credential ref in media_library.config before calling init, never passing the raw reference through', async () => {
    mockCurrentBackend.mockReturnValue({ getToken: () => Promise.resolve('user-token') } as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 'resolved-public-key' }),
    }) as unknown as typeof fetch;

    const init = jest.fn().mockResolvedValue({ show: jest.fn(), enableStandalone: () => true });
    registerMediaLibrary({ name: 'e2e-test-library', init } as never);

    // Import for its module-level `store.subscribe` side effect.
    await import('../mediaLibrary');

    store.dispatch(authenticate({ name: 'tester', token: 'user-token' }));
    store.dispatch(
      configLoaded({
        backend: { name: 'test' },
        collections: [],
        credentials_url: 'https://example.com/credentials',
        media_library: {
          name: 'e2e-test-library',
          config: { publicKey: { credential: 'stock_photo_key' } },
        },
        error: undefined,
        isFetching: false,
      } as unknown as CmsConfig),
    );

    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(init).toHaveBeenCalledTimes(1);
    const [{ options }] = init.mock.calls[0];
    expect(options).toEqual({
      name: 'e2e-test-library',
      config: { publicKey: 'resolved-public-key' },
    });
  });
});

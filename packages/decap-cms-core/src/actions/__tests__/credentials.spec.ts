import {
  getCredential,
  fetchCredential,
  credentialRequest,
  credentialSuccess,
  credentialFailure,
  CREDENTIAL_REQUEST,
  CREDENTIAL_SUCCESS,
  CREDENTIAL_FAILURE,
} from '../credentials';
import { currentBackend } from '../../backend';

import type { State } from '../../types/redux';

jest.mock('../../backend', () => ({
  currentBackend: jest.fn(),
}));

const mockCurrentBackend = currentBackend as jest.MockedFunction<typeof currentBackend>;

function makeState(
  overrides: Partial<State['config']> = {},
  credentials: State['credentials'] = {},
) {
  return {
    config: { credentials_url: 'https://example.com/credentials', ...overrides },
    credentials,
  } as unknown as State;
}

describe('credentials action creators', () => {
  it('credentialRequest(name) returns CREDENTIAL_REQUEST action', () => {
    expect(credentialRequest('foo')).toEqual({
      type: CREDENTIAL_REQUEST,
      payload: { name: 'foo' },
    });
  });

  it('credentialSuccess(name, value) returns CREDENTIAL_SUCCESS action', () => {
    expect(credentialSuccess('foo', 'secret-value')).toEqual({
      type: CREDENTIAL_SUCCESS,
      payload: { name: 'foo', value: 'secret-value' },
    });
  });

  it('credentialFailure(name, error) returns CREDENTIAL_FAILURE action', () => {
    expect(credentialFailure('foo', 'boom')).toEqual({
      type: CREDENTIAL_FAILURE,
      payload: { name: 'foo', error: 'boom' },
    });
  });
});

describe('fetchCredential', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('requests the named credential and returns its value', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 'sk-abc123' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const value = await fetchCredential(
      'https://example.com/credentials',
      'stock_photo_key',
      'Bearer tok',
    );

    expect(value).toBe('sk-abc123');
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(String(calledUrl)).toContain('name=stock_photo_key');
    expect(calledOptions.headers.Authorization).toBe('Bearer tok');
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;

    await expect(
      fetchCredential('https://example.com/credentials', 'k', 'Bearer tok'),
    ).rejects.toThrow(/401/);
  });

  it('throws when the response body has no string value', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    await expect(
      fetchCredential('https://example.com/credentials', 'k', 'Bearer tok'),
    ).rejects.toThrow(/invalid response/);
  });
});

describe('getCredential thunk', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns undefined and never calls fetch when credentials_url is not configured', async () => {
    const state = makeState({ credentials_url: undefined });
    const dispatch = jest.fn();
    const mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const value = await getCredential('key')(dispatch, () => state);

    expect(value).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns undefined and never calls fetch when the user is not authenticated', async () => {
    mockCurrentBackend.mockReturnValue({ getToken: () => Promise.resolve(null) } as never);
    const state = makeState();
    const dispatch = jest.fn();
    const mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const value = await getCredential('key')(dispatch, () => state);

    expect(value).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches and dispatches success once authenticated, and never leaks the value into a config action', async () => {
    mockCurrentBackend.mockReturnValue({ getToken: () => Promise.resolve('user-token') } as never);
    const state = makeState();
    const dispatch = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 'super-secret' }),
    }) as unknown as typeof fetch;

    const value = await getCredential('key')(dispatch, () => state);

    expect(value).toBe('super-secret');
    expect(dispatch).toHaveBeenCalledWith(credentialRequest('key'));
    expect(dispatch).toHaveBeenCalledWith(credentialSuccess('key', 'super-secret'));
    // The credential value must only ever flow through CREDENTIAL_* actions,
    // never through a CONFIG_* action (which would land it in the public
    // config.yml-shaped redux slice).
    for (const call of dispatch.mock.calls) {
      const action = call[0];
      if (typeof action === 'object' && action && 'type' in action) {
        expect(String(action.type)).not.toMatch(/^CONFIG_/);
      }
    }
  });

  it('returns the cached value without re-fetching', async () => {
    mockCurrentBackend.mockReturnValue({ getToken: () => Promise.resolve('user-token') } as never);
    const state = makeState({}, { key: { status: 'success', value: 'cached-value' } });
    const dispatch = jest.fn();
    const mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const value = await getCredential('key')(dispatch, () => state);

    expect(value).toBe('cached-value');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches failure and returns undefined on fetch error, without throwing', async () => {
    mockCurrentBackend.mockReturnValue({ getToken: () => Promise.resolve('user-token') } as never);
    const state = makeState();
    const dispatch = jest.fn();
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const value = await getCredential('key')(dispatch, () => state);

    expect(value).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith({
      type: CREDENTIAL_FAILURE,
      payload: { name: 'key', error: expect.stringContaining('500') },
    });
  });
});

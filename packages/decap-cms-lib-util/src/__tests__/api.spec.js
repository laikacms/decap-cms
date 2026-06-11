// Mock unsentRequest so apiRequest / getDefaultBranchName tests fully control
// the network layer without going through the real fetch path.
jest.mock('../unsentRequest', () => {
  const mockPerformRequest = jest.fn();
  return {
    __esModule: true,
    default: {
      performRequest: mockPerformRequest,
      fromFetchArguments: jest.fn((url, options) => ({ url, options })),
    },
  };
});

// Mock asyncLock so rate-limiter back-off resolves immediately in unit tests,
// removing the need to advance real or fake timers for the setTimeout delays.
jest.mock('../asyncLock', () => ({
  asyncLock: () => ({
    acquire: () => Promise.resolve(true),
    release: () => {},
  }),
}));

import * as api from '../API';
import unsentRequest from '../unsentRequest';

// ---------------------------------------------------------------------------
// Helpers / shared mocks
// ---------------------------------------------------------------------------

function makeResponse(status, body = {}, headers = {}) {
  const headerMap = new Map(Object.entries(headers));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: key => headerMap.get(key) ?? null,
      has: key => headerMap.has(key),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function makeLocalForage(initialItems = {}) {
  const store = { ...initialItems };
  return {
    getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve(value);
    }),
    _store: store,
  };
}

// Make a fresh api object (with rateLimiter cleared) for each backoff test.
function freshMockApi(requestFunction) {
  return {
    rateLimiter: undefined,
    buildRequest: req => req,
    requestFunction,
  };
}

// ---------------------------------------------------------------------------
// requestWithBackoff
// ---------------------------------------------------------------------------

describe('requestWithBackoff', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns response when request succeeds on first attempt', async () => {
    const response = makeResponse(200);
    const mockApi = freshMockApi(jest.fn().mockResolvedValue(response));
    const result = await api.requestWithBackoff(mockApi, { url: '/test' });
    expect(result).toBe(response);
    expect(mockApi.requestFunction).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and eventually succeeds', async () => {
    const tooManyResponse = makeResponse(429, 'rate limited');
    const okResponse = makeResponse(200);
    // asyncLock is mocked to resolve immediately, so retries happen without real timers.
    const requestFunction = jest
      .fn()
      .mockResolvedValueOnce(tooManyResponse)
      .mockResolvedValue(okResponse);

    const mockApi = freshMockApi(requestFunction);
    const result = await api.requestWithBackoff(mockApi, { url: '/test' });
    expect(result).toBe(okResponse);
    expect(requestFunction.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('retries on 403 with rate-limit message and eventually succeeds', async () => {
    const rateLimitResponse = makeResponse(
      403,
      { message: 'API rate limit exceeded for user' },
      { 'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 5) },
    );
    const okResponse = makeResponse(200);
    const requestFunction = jest
      .fn()
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValue(okResponse);

    const mockApi = freshMockApi(requestFunction);
    const result = await api.requestWithBackoff(mockApi, { url: '/test' });
    expect(result).toBe(okResponse);
    expect(requestFunction.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('returns the 403 response when it is not a rate-limit error', async () => {
    const forbiddenResponse = makeResponse(403, { message: 'Forbidden' });
    const mockApi = freshMockApi(jest.fn().mockResolvedValue(forbiddenResponse));

    const result = await api.requestWithBackoff(mockApi, { url: '/test' });
    expect(result.status).toBe(403);
    expect(mockApi.requestFunction).toHaveBeenCalledTimes(1);
  });

  it('throws after more than 5 attempts', async () => {
    // asyncLock mock resolves immediately, so all 6 attempts happen without real timers.
    const requestFunction = jest.fn().mockResolvedValue(makeResponse(429, 'too many'));
    const mockApi = freshMockApi(requestFunction);
    await expect(api.requestWithBackoff(mockApi, { url: '/test' })).rejects.toThrow();
    expect(requestFunction).toHaveBeenCalledTimes(6);
  });

  it('stops retrying immediately for implicit-auth token errors', async () => {
    const requestFunction = jest
      .fn()
      .mockRejectedValue(new Error("Can't refresh access token when using implicit auth"));
    const mockApi = freshMockApi(requestFunction);

    await expect(api.requestWithBackoff(mockApi, { url: '/test' })).rejects.toThrow(
      "Can't refresh access token when using implicit auth",
    );
    expect(requestFunction).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// readFile
// ---------------------------------------------------------------------------

describe('readFile', () => {
  it('returns cached value when key exists (isText=true)', async () => {
    const cached = 'cached content';
    const localForage = makeLocalForage({ 'gh.abc123': cached });
    const fetchContent = jest.fn();

    const result = await api.readFile('abc123', fetchContent, localForage, true);
    expect(result).toBe(cached);
    expect(fetchContent).not.toHaveBeenCalled();
  });

  it('returns cached value when key exists (isText=false / blob)', async () => {
    const cachedBlob = new Blob(['data']);
    const localForage = makeLocalForage({ 'gh.abc123.blob': cachedBlob });
    const fetchContent = jest.fn();

    const result = await api.readFile('abc123', fetchContent, localForage, false);
    expect(result).toBe(cachedBlob);
    expect(fetchContent).not.toHaveBeenCalled();
  });

  it('calls fetchContent and caches result on cache miss', async () => {
    const localForage = makeLocalForage();
    const content = 'fetched content';
    const fetchContent = jest.fn().mockResolvedValue(content);

    const result = await api.readFile('abc123', fetchContent, localForage, true);
    expect(result).toBe(content);
    expect(fetchContent).toHaveBeenCalledTimes(1);
    expect(localForage.setItem).toHaveBeenCalledWith('gh.abc123', content);
  });

  it('uses .blob key suffix when isText is false', async () => {
    const localForage = makeLocalForage();
    const content = new Blob(['binary']);
    const fetchContent = jest.fn().mockResolvedValue(content);

    await api.readFile('abc123', fetchContent, localForage, false);
    expect(localForage.setItem).toHaveBeenCalledWith('gh.abc123.blob', content);
  });

  it('calls fetchContent without caching when id is null', async () => {
    const localForage = makeLocalForage();
    const content = 'no-id content';
    const fetchContent = jest.fn().mockResolvedValue(content);

    const result = await api.readFile(null, fetchContent, localForage, true);
    expect(result).toBe(content);
    expect(localForage.setItem).not.toHaveBeenCalled();
    expect(localForage.getItem).not.toHaveBeenCalled();
  });

  it('calls fetchContent without caching when id is undefined', async () => {
    const localForage = makeLocalForage();
    const content = 'no-id content';
    const fetchContent = jest.fn().mockResolvedValue(content);

    const result = await api.readFile(undefined, fetchContent, localForage, true);
    expect(result).toBe(content);
    expect(localForage.setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// readFileMetadata
// ---------------------------------------------------------------------------

describe('readFileMetadata', () => {
  it('returns cached metadata on cache hit', async () => {
    const meta = { author: 'Alice', updatedOn: '2024-01-01' };
    const localForage = makeLocalForage({ 'gh.abc123.meta': meta });
    const fetchMetadata = jest.fn();

    const result = await api.readFileMetadata('abc123', fetchMetadata, localForage);
    expect(result).toEqual(meta);
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it('fetches and caches metadata on cache miss', async () => {
    const localForage = makeLocalForage();
    const meta = { author: 'Bob', updatedOn: '2024-06-01' };
    const fetchMetadata = jest.fn().mockResolvedValue(meta);

    const result = await api.readFileMetadata('abc123', fetchMetadata, localForage);
    expect(result).toEqual(meta);
    expect(fetchMetadata).toHaveBeenCalledTimes(1);
    expect(localForage.setItem).toHaveBeenCalledWith('gh.abc123.meta', meta);
  });

  it('fetches without caching when id is null', async () => {
    const localForage = makeLocalForage();
    const meta = { author: 'Carol', updatedOn: '2024-03-01' };
    const fetchMetadata = jest.fn().mockResolvedValue(meta);

    const result = await api.readFileMetadata(null, fetchMetadata, localForage);
    expect(result).toEqual(meta);
    expect(localForage.setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// apiRequest
// ---------------------------------------------------------------------------

describe('apiRequest', () => {
  beforeEach(() => {
    unsentRequest.fromFetchArguments.mockClear();
    unsentRequest.performRequest.mockClear();
  });

  it('constructs a github URL from the default apiRoot', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/repos/owner/repo', { backend: 'github' });
    const capturedUrl = unsentRequest.fromFetchArguments.mock.calls[0][0];
    expect(capturedUrl).toMatch(/^https:\/\/api\.github\.com\/repos\/owner\/repo/);
  });

  it('constructs a gitlab URL from the default apiRoot', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/projects/owner%2Frepo', { backend: 'gitlab' });
    const capturedUrl = unsentRequest.fromFetchArguments.mock.calls[0][0];
    expect(capturedUrl).toMatch(/^https:\/\/gitlab\.com\/api\/v4\/projects/);
  });

  it('constructs a bitbucket URL from the default apiRoot', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/repositories/owner/repo', { backend: 'bitbucket' });
    const capturedUrl = unsentRequest.fromFetchArguments.mock.calls[0][0];
    expect(capturedUrl).toMatch(/^https:\/\/api\.bitbucket\.org\/2\.0\/repositories/);
  });

  it('uses a custom apiRoot when provided', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/repos/owner/repo', {
      backend: 'github',
      apiRoot: 'https://github.example.com/api/v3',
    });
    const capturedUrl = unsentRequest.fromFetchArguments.mock.calls[0][0];
    expect(capturedUrl).toMatch(/^https:\/\/github\.example\.com\/api\/v3\/repos/);
  });

  it('appends params as query string', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/repos/owner/repo', {
      backend: 'github',
      params: { per_page: 10, ref: 'main' },
    });
    const capturedUrl = unsentRequest.fromFetchArguments.mock.calls[0][0];
    expect(capturedUrl).toContain('per_page=10');
    expect(capturedUrl).toContain('ref=main');
  });

  it('injects Authorization header when token is provided', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(makeResponse(200, {}));

    await api.apiRequest('/repos/owner/repo', { backend: 'github', token: 'my-token' });
    const capturedHeaders = unsentRequest.fromFetchArguments.mock.calls[0][1].headers;
    expect(capturedHeaders['Authorization']).toBe('Bearer my-token');
  });

  it('wraps network errors in APIError', async () => {
    // asyncLock is mocked to resolve immediately, so all 6 attempts run without real timers.
    jest.spyOn(console, 'log').mockImplementation(() => {});
    unsentRequest.performRequest.mockRejectedValue(new Error('network failure'));

    await expect(
      api.apiRequest('/repos/owner/repo', { backend: 'github' }),
    ).rejects.toMatchObject({ name: 'API_ERROR', api: 'github' });

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// getDefaultBranchName
// ---------------------------------------------------------------------------

describe('getDefaultBranchName', () => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  beforeEach(() => {
    unsentRequest.fromFetchArguments.mockClear();
    unsentRequest.performRequest.mockClear();
  });

  it('returns default_branch for github', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(
      makeResponse(200, { default_branch: 'main' }, jsonHeaders),
    );

    const result = await api.getDefaultBranchName({ backend: 'github', repo: 'owner/repo' });
    expect(result).toBe('main');
  });

  it('returns default_branch for gitlab', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(
      makeResponse(200, { default_branch: 'develop' }, jsonHeaders),
    );

    const result = await api.getDefaultBranchName({ backend: 'gitlab', repo: 'owner/repo' });
    expect(result).toBe('develop');
  });

  it('returns mainbranch.name for bitbucket', async () => {
    unsentRequest.performRequest.mockResolvedValueOnce(
      makeResponse(200, { mainbranch: { name: 'master' } }, jsonHeaders),
    );

    const result = await api.getDefaultBranchName({ backend: 'bitbucket', repo: 'owner/repo' });
    expect(result).toBe('master');
  });

  it('calls the correct path for each backend', async () => {
    unsentRequest.performRequest
      .mockResolvedValueOnce(makeResponse(200, { default_branch: 'main' }, jsonHeaders))
      .mockResolvedValueOnce(makeResponse(200, { default_branch: 'main' }, jsonHeaders))
      .mockResolvedValueOnce(makeResponse(200, { mainbranch: { name: 'main' } }, jsonHeaders));

    await api.getDefaultBranchName({ backend: 'github', repo: 'owner/repo' });
    await api.getDefaultBranchName({ backend: 'gitlab', repo: 'owner/repo' });
    await api.getDefaultBranchName({ backend: 'bitbucket', repo: 'owner/repo' });

    const urls = unsentRequest.fromFetchArguments.mock.calls.map(call => call[0]);
    expect(urls[0]).toContain('/repos/owner/repo');
    expect(urls[1]).toContain('/projects/');
    expect(urls[2]).toContain('/repositories/owner/repo');
  });
});

// ---------------------------------------------------------------------------
// throwOnConflictingBranches
// ---------------------------------------------------------------------------

describe('throwOnConflictingBranches', () => {
  it('does not throw when no conflicting branches exist', async () => {
    const getBranch = jest.fn().mockRejectedValue(new Error('not found'));
    await expect(
      api.throwOnConflictingBranches('cms/posts/post-1', getBranch, 'github'),
    ).resolves.toBeUndefined();
  });

  it('throws APIError when a conflicting branch is found', async () => {
    const getBranch = jest.fn(name => {
      if (name === 'cms/posts') return Promise.resolve({ name: 'cms/posts' });
      return Promise.reject(new Error('not found'));
    });

    await expect(
      api.throwOnConflictingBranches('cms/posts/post-1', getBranch, 'github'),
    ).rejects.toMatchObject({
      name: 'API_ERROR',
      message: expect.stringContaining("cms/posts"),
    });
  });

  it('throws with the first conflicting branch name in the message', async () => {
    const getBranch = jest.fn(name => {
      if (name === 'cms') return Promise.resolve({ name: 'cms' });
      if (name === 'cms/posts') return Promise.resolve({ name: 'cms/posts' });
      return Promise.reject(new Error('not found'));
    });

    await expect(
      api.throwOnConflictingBranches('cms/posts/post-1', getBranch, 'github'),
    ).rejects.toMatchObject({
      message: expect.stringContaining('cms'),
    });
  });

  it('does not throw for a single-segment branch name (no possible conflicts)', async () => {
    const getBranch = jest.fn();
    await expect(
      api.throwOnConflictingBranches('main', getBranch, 'github'),
    ).resolves.toBeUndefined();
    expect(getBranch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Original tests below (unchanged)
// ---------------------------------------------------------------------------

describe('Api', () => {
  describe('getPreviewStatus', () => {
    it('should return preview status on matching context', () => {
      expect(api.getPreviewStatus([{ context: 'deploy' }])).toEqual({ context: 'deploy' });
    });

    it('should return undefined on matching context', () => {
      expect(api.getPreviewStatus([{ context: 'other' }])).toBeUndefined();
    });
  });

  describe('parseResponse', () => {
    it('should resolve parsed JSON for JSON content-type', async () => {
      const data = { foo: 'bar' };
      const response = {
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(data),
      };
      await expect(api.parseResponse(response)).resolves.toEqual(data);
    });

    it('should resolve text for text content-type when ok', async () => {
      const response = {
        ok: true,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('hello'),
      };
      await expect(api.parseResponse(response)).resolves.toBe('hello');
    });

    it('should reject with body text for text content-type when not ok', async () => {
      const response = {
        ok: false,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('error message'),
      };
      await expect(api.parseResponse(response)).rejects.toBe('error message');
    });
  });

  describe('isPreviewContext', () => {
    it('should return true when context exactly matches previewContext', () => {
      expect(
        api.isPreviewContext('netlify/my-site/deploy-preview', 'netlify/my-site/deploy-preview'),
      ).toBe(true);
    });

    it('should return false when context does not match previewContext', () => {
      expect(
        api.isPreviewContext('netlify/my-site/deploy-preview', 'netlify/other-site/deploy-preview'),
      ).toBe(false);
    });

    it('should return true when no previewContext and context includes a keyword', () => {
      expect(api.isPreviewContext('deploy-preview', '')).toBe(true);
    });

    it('should return false when no previewContext and context does not include any keyword', () => {
      expect(api.isPreviewContext('ci/build', '')).toBe(false);
    });
  });
});

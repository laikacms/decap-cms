import { PreviewState } from 'decap-cms-lib-util';

import GitGateway from '../implementation';

// Minimal config factory
function makeConfig(backendOverrides = {}) {
  return {
    backend: {
      name: 'git-gateway',
      ...backendOverrides,
    },
    auth: {},
    media_folder: 'static/uploads',
  };
}

// Stub out the parts of the class that touch browser globals
jest.mock('gotrue-js', () => jest.fn().mockImplementation(() => ({})));
jest.mock('decap-cms-ui-auth', () => ({
  NetlifyAuthenticationPage: { authClient: null },
  PKCEAuthenticationPage: {},
}));

// Suppress console.warn in tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  console.warn.mockRestore();
});

// Mock window.netlifyIdentity absent so initPromise resolves immediately
beforeEach(() => {
  delete window.netlifyIdentity;
  global.fetch = jest.fn();
  // jsdom's localStorage can't be reassigned (accessor, no setter); clear it instead
  window.localStorage.clear();
});

afterEach(() => {
  jest.resetAllMocks();
});

function makeComponents(...entries) {
  return { components: entries };
}

describe('GitGateway status()', () => {
  it('returns operational=true when default "Git Gateway" component is operational', async () => {
    const gw = new GitGateway(makeConfig());
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(makeComponents({ id: '1', name: 'Git Gateway', status: 'operational' })),
    });

    const result = await gw.status();
    expect(result.api.status).toBe(true);
    expect(result.auth.status).toBe(true);
  });

  it('returns operational=false when default "Git Gateway" component is degraded', async () => {
    const gw = new GitGateway(makeConfig());
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(makeComponents({ id: '1', name: 'Git Gateway', status: 'major_outage' })),
    });

    const result = await gw.status();
    expect(result.api.status).toBe(false);
    // auth check is skipped when api is down
    expect(result.auth.status).toBe(false);
  });

  it('uses custom status_component_name to match component', async () => {
    const gw = new GitGateway(
      makeConfig({
        status_endpoint: 'https://status.example.com/api/v2/components.json',
        status_component_name: 'My Custom Gateway',
      }),
    );
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(
          makeComponents(
            { id: '1', name: 'Git Gateway', status: 'major_outage' },
            { id: '2', name: 'My Custom Gateway', status: 'operational' },
          ),
        ),
    });

    const result = await gw.status();
    // Should match "My Custom Gateway", not "Git Gateway"
    expect(result.api.status).toBe(true);
  });

  it('returns false when custom component is not operational', async () => {
    const gw = new GitGateway(
      makeConfig({
        status_endpoint: 'https://status.example.com/api/v2/components.json',
        status_component_name: 'My Custom Gateway',
      }),
    );
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(
          makeComponents(
            { id: '1', name: 'Git Gateway', status: 'operational' },
            { id: '2', name: 'My Custom Gateway', status: 'partial_outage' },
          ),
        ),
    });

    const result = await gw.status();
    expect(result.api.status).toBe(false);
  });

  it('derives statusPage from status_endpoint origin when no status_page set', async () => {
    const gw = new GitGateway(
      makeConfig({
        status_endpoint: 'https://status.example.com/api/v2/components.json',
        status_component_name: 'My Custom Gateway',
      }),
    );
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(
          makeComponents({ id: '1', name: 'My Custom Gateway', status: 'operational' }),
        ),
    });

    const result = await gw.status();
    expect(result.api.statusPage).toBe('https://status.example.com');
  });

  it('uses explicit status_page when provided', async () => {
    const gw = new GitGateway(
      makeConfig({
        status_endpoint: 'https://status.example.com/api/v2/components.json',
        status_page: 'https://status.example.com/incidents',
        status_component_name: 'My Custom Gateway',
      }),
    );
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(
          makeComponents({ id: '1', name: 'My Custom Gateway', status: 'operational' }),
        ),
    });

    const result = await gw.status();
    expect(result.api.statusPage).toBe('https://status.example.com/incidents');
  });

  it('falls back to default Netlify status page when no custom endpoint configured', async () => {
    const gw = new GitGateway(makeConfig());
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(makeComponents({ id: '1', name: 'Git Gateway', status: 'operational' })),
    });

    const result = await gw.status();
    expect(result.api.statusPage).toBe('https://www.netlifystatus.com');
  });

  it('returns api=true (vacuously) when no component matches the name', async () => {
    const gw = new GitGateway(
      makeConfig({
        status_endpoint: 'https://status.example.com/api/v2/components.json',
        status_component_name: 'Nonexistent Component',
      }),
    );
    gw.tokenPromise = () => Promise.resolve('tok');

    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve(makeComponents({ id: '1', name: 'Git Gateway', status: 'major_outage' })),
    });

    const result = await gw.status();
    // Array.every on empty array returns true
    expect(result.api.status).toBe(true);
  });

  it('returns api=true and skips auth when fetch throws', async () => {
    const gw = new GitGateway(makeConfig());
    const tokenSpy = jest.fn(() => Promise.resolve('tok'));
    gw.tokenPromise = tokenSpy;

    fetch.mockRejectedValue(new Error('Network error'));

    const result = await gw.status();
    expect(result.api.status).toBe(true);
    // auth still checked since api=true
    expect(result.auth.status).toBe(true);
  });
});

describe('GitGateway getDeployPreview()', () => {
  function mockNetlifyResponses(site, deploys) {
    fetch.mockImplementation(url => {
      if (url.endsWith('/deploys?per_page=100')) {
        return Promise.resolve({ json: () => Promise.resolve(deploys) });
      }
      return Promise.resolve({ json: () => Promise.resolve(site) });
    });
  }

  it('returns the backend preview without falling back to the Netlify API', async () => {
    const gw = new GitGateway(makeConfig());
    gw.backend = { getDeployPreview: jest.fn().mockResolvedValue({ status: 'success', url: 'x' }) };

    const preview = await gw.getDeployPreview('posts', 'my-slug');

    expect(preview).toEqual({ status: 'success', url: 'x' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to the public Netlify API without a token when none is configured', async () => {
    const gw = new GitGateway(makeConfig());
    gw.backend = { getDeployPreview: jest.fn().mockResolvedValue(undefined) };
    gw.api = { getUnpublishedEntrySha: jest.fn().mockResolvedValue('abc123') };
    localStorage.setItem('netlifySiteURL', 'https://my-site.netlify.app');

    mockNetlifyResponses({ id: 'site-id' }, [
      { state: 'ready', commit_ref: 'abc123', deploy_url: 'https://deploy.example.com' },
    ]);

    const preview = await gw.getDeployPreview('posts', 'my-slug');

    expect(preview).toEqual({ status: PreviewState.Success, url: 'https://deploy.example.com' });
    fetch.mock.calls.forEach(([, options]) => {
      expect(options).toEqual({ headers: undefined });
    });
  });

  it('sends the configured Netlify API token so private-log sites resolve', async () => {
    const gw = new GitGateway(makeConfig({ netlify_api_token: 'secret-token' }));
    gw.backend = { getDeployPreview: jest.fn().mockResolvedValue(undefined) };
    gw.api = { getUnpublishedEntrySha: jest.fn().mockResolvedValue('abc123') };
    localStorage.setItem('netlifySiteURL', 'https://my-site.netlify.app');

    mockNetlifyResponses({ id: 'site-id' }, [
      { state: 'ready', commit_ref: 'abc123', deploy_url: 'https://deploy.example.com' },
    ]);

    const preview = await gw.getDeployPreview('posts', 'my-slug');

    expect(preview).toEqual({ status: PreviewState.Success, url: 'https://deploy.example.com' });
    fetch.mock.calls.forEach(([, options]) => {
      expect(options).toEqual({ headers: { Authorization: 'Bearer secret-token' } });
    });
  });

  it('returns no preview (no crash) when the Netlify API call fails', async () => {
    const gw = new GitGateway(makeConfig());
    gw.backend = { getDeployPreview: jest.fn().mockResolvedValue(undefined) };
    gw.api = { getUnpublishedEntrySha: jest.fn().mockResolvedValue('abc123') };
    localStorage.setItem('netlifySiteURL', 'https://my-site.netlify.app');

    fetch.mockRejectedValue(new Error('Network error'));

    const preview = await gw.getDeployPreview('posts', 'my-slug');

    expect(preview).toBeUndefined();
  });
});

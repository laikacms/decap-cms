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
  // Minimal localStorage stub
  global.localStorage = { getItem: jest.fn(() => null) };
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

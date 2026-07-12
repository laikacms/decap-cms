import Azure, { parseAzureRepo } from '../implementation';

import type { Config } from 'decap-cms-lib-util';

const mockUser = jest.fn().mockResolvedValue({ name: 'Test User', email: 'test@example.com' });

jest.mock('../API', () => {
  const MockAPI = jest.fn().mockImplementation(() => ({
    user: mockUser,
  }));
  return { __esModule: true, default: MockAPI, API_NAME: 'Azure DevOps' };
});

function configWithRepo(repo: unknown): Config {
  return {
    backend: {
      repo,
    },
  } as unknown as Config;
}

describe('parseAzureRepo', () => {
  it('returns org, project, and repoName for a valid org/project/repo string', () => {
    const config = configWithRepo('my-org/my-project/my-repo');

    expect(parseAzureRepo(config)).toEqual({
      org: 'my-org',
      project: 'my-project',
      repoName: 'my-repo',
    });
  });

  it('throws when repo is missing', () => {
    const config = configWithRepo(undefined);

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend needs a "repo" in the backend configuration.',
    );
  });

  it('throws when repo is not a string', () => {
    const config = configWithRepo(123);

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend needs a "repo" in the backend configuration.',
    );
  });

  it('throws when repo does not have exactly three segments', () => {
    const config = configWithRepo('my-org/my-repo');

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend must be in a the format of {org}/{project}/{repo}',
    );
  });

  it('throws when repo has more than three segments', () => {
    const config = configWithRepo('my-org/my-project/my-repo/extra');

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend must be in a the format of {org}/{project}/{repo}',
    );
  });
});

function makeConfig(overrides: Record<string, unknown> = {}): Config {
  return {
    backend: {
      repo: 'my-org/my-project/my-repo',
      ...overrides,
    },
    media_folder: 'static/img',
    base_url: '',
    site_id: '',
  } as unknown as Config;
}

describe('Azure.authenticate() branch resolution', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.mockResolvedValue({ name: 'Test User', email: 'test@example.com' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves the repo default branch when branch is not configured', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ defaultBranch: 'refs/heads/main' }),
    }) as unknown as typeof fetch;

    const backend = new Azure(makeConfig());
    expect(backend.isBranchConfigured).toBe(false);
    expect(backend.branch).toBe('master');

    await backend.authenticate({ token: 'test-token' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://dev.azure.com/my-org/my-project/_apis/git/repositories/my-repo',
      { headers: { Authorization: 'Bearer test-token' } },
    );
    expect(backend.branch).toBe('main');
  });

  it('keeps the configured branch and does not call the Azure DevOps API', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const backend = new Azure(makeConfig({ branch: 'develop' }));
    expect(backend.isBranchConfigured).toBe(true);

    await backend.authenticate({ token: 'test-token' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(backend.branch).toBe('develop');
  });

  it('falls back to master when the Azure DevOps API request fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

    const backend = new Azure(makeConfig());

    await backend.authenticate({ token: 'test-token' });

    expect(backend.branch).toBe('master');
  });

  it('falls back to master when the response has no defaultBranch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const backend = new Azure(makeConfig());

    await backend.authenticate({ token: 'test-token' });

    expect(backend.branch).toBe('master');
  });
});

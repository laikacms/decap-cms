import BitbucketBackend from '../implementation';

jest.mock('decap-cms-lib-util', () => ({
  ...jest.requireActual('decap-cms-lib-util'),
  getDefaultBranchName: jest.fn(),
}));

const mockHasWriteAccess = jest.fn().mockResolvedValue(true);
const mockUser = jest.fn().mockResolvedValue({
  display_name: 'Test User',
  username: 'testuser',
  links: { avatar: { href: 'https://example.com/avatar.png' } },
});

jest.mock('../API', () => {
  const MockAPI = jest.fn().mockImplementation(() => ({
    hasWriteAccess: mockHasWriteAccess,
    user: mockUser,
  }));
  return { __esModule: true, default: MockAPI, API_NAME: 'Bitbucket' };
});

const { getDefaultBranchName } = require('decap-cms-lib-util');

function makeConfig(overrides = {}) {
  return {
    backend: {
      repo: 'owner/repo',
      ...overrides,
    },
    media_folder: 'static/img',
    base_url: '',
    site_id: '',
  };
}

describe('BitbucketBackend.authenticate()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasWriteAccess.mockResolvedValue(true);
    mockUser.mockResolvedValue({
      display_name: 'Test User',
      username: 'testuser',
      links: { avatar: { href: 'https://example.com/avatar.png' } },
    });
    getDefaultBranchName.mockResolvedValue(null);
  });

  test('resolves default branch via getDefaultBranchName when branch is not configured', async () => {
    const backend = new BitbucketBackend(makeConfig());
    expect(backend.isBranchConfigured).toBe(false);
    expect(backend.branch).toBe('master');

    getDefaultBranchName.mockResolvedValue('main');

    await backend.authenticate({ token: 'test-token', refresh_token: 'refresh' });

    expect(getDefaultBranchName).toHaveBeenCalledWith({
      backend: 'bitbucket',
      repo: 'owner/repo',
      token: 'test-token',
    });
    expect(backend.branch).toBe('main');
  });

  test('keeps configured branch and skips getDefaultBranchName when branch is configured', async () => {
    const backend = new BitbucketBackend(makeConfig({ branch: 'develop' }));
    expect(backend.isBranchConfigured).toBe(true);
    expect(backend.branch).toBe('develop');

    await backend.authenticate({ token: 'test-token', refresh_token: 'refresh' });

    expect(getDefaultBranchName).not.toHaveBeenCalled();
    expect(backend.branch).toBe('develop');
  });

  test('falls back to master when getDefaultBranchName returns null', async () => {
    const backend = new BitbucketBackend(makeConfig());
    getDefaultBranchName.mockResolvedValue(null);

    await backend.authenticate({ token: 'test-token', refresh_token: 'refresh' });

    expect(backend.branch).toBe('master');
  });
});

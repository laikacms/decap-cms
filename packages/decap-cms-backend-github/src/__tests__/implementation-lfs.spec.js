import GitHubImplementation from '../implementation';

jest.mock('../API', () => {
  const MockAPI = jest.fn();
  MockAPI.API_NAME = 'GitHub';
  return { __esModule: true, default: MockAPI, API_NAME: 'GitHub' };
});

const config = {
  backend: {
    repo: 'owner/repo',
    open_authoring: false,
    api_root: 'https://api.github.com',
  },
  media_folder: 'static/media',
};

const POINTER = `version https://git-lfs.github.com/spec/v1
oid sha256:abc123
size 12345
`;

beforeEach(() => {
  jest.clearAllMocks();
  global.URL = { createObjectURL: jest.fn().mockReturnValue('blob:displayURL') };
});

function makeBlob(text) {
  return new Blob([text]);
}

describe('github backend LFS support', () => {
  describe('getLargeMediaClient', () => {
    it('is disabled when .gitattributes is missing (404)', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockRejectedValue({ status: 404 }),
      };

      const client = await gitHubImplementation.getLargeMediaClient();
      expect(client.enabled).toBe(false);
    });

    it('is disabled when .gitattributes has no lfs-tracked patterns', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockResolvedValue('*.md text\n'),
      };

      const client = await gitHubImplementation.getLargeMediaClient();
      expect(client.enabled).toBe(false);
    });

    it('is enabled and exposes patterns when .gitattributes tracks files via lfs', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest
          .fn()
          .mockResolvedValue('*.bin filter=lfs diff=lfs merge=lfs -text\nother text\n'),
      };

      const client = await gitHubImplementation.getLargeMediaClient();
      expect(client.enabled).toBe(true);
      expect(client.patterns).toEqual(['*.bin']);
      expect(client.rootURL).toBe('https://github.com/owner/repo.git/info/lfs');
    });

    it('uses the configured large_media_url instead of the default', async () => {
      const gitHubImplementation = new GitHubImplementation({
        ...config,
        backend: { ...config.backend, large_media_url: 'https://ghe.example.com/o/r.git/info/lfs' },
      });
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockResolvedValue('*.bin filter=lfs diff=lfs merge=lfs -text\n'),
      };

      const client = await gitHubImplementation.getLargeMediaClient();
      expect(client.rootURL).toBe('https://ghe.example.com/o/r.git/info/lfs');
    });

    it('is memoized so .gitattributes is only fetched once', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const readFile = jest.fn().mockResolvedValue('*.bin filter=lfs diff=lfs merge=lfs -text\n');
      gitHubImplementation.api = { repo: 'owner/repo', readFile };

      await gitHubImplementation.getLargeMediaClient();
      await gitHubImplementation.getLargeMediaClient();
      expect(readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMediaFile pointer resolution', () => {
    it('resolves an LFS pointer file to the real content for a tracked path', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const realBlob = makeBlob('real binary content');
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest
          .fn()
          .mockResolvedValueOnce('*.bin filter=lfs diff=lfs merge=lfs -text\n') // .gitattributes
          .mockResolvedValueOnce(makeBlob(POINTER)), // the tracked file itself
      };
      const downloadResource = jest.fn().mockResolvedValue(realBlob);
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath: () => true,
        downloadResource,
      });

      const result = await gitHubImplementation.getMediaFile('static/media/large.bin');

      expect(downloadResource).toHaveBeenCalledWith({ sha: 'abc123', size: 12345 });
      expect(result.size).toBe(realBlob.size);
    });

    it('leaves non-pointer content untouched even for a tracked path', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const smallBlob = makeBlob('not a pointer');
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockResolvedValue(smallBlob),
      };
      const downloadResource = jest.fn();
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath: () => true,
        downloadResource,
      });

      const result = await gitHubImplementation.getMediaFile('static/media/small.bin');

      expect(downloadResource).not.toHaveBeenCalled();
      expect(result.size).toBe(smallBlob.size);
    });

    it('does not attempt pointer resolution for a path outside the LFS patterns', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const blob = makeBlob('some content');
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockResolvedValue(blob),
      };
      const downloadResource = jest.fn();
      const matchPath = jest.fn().mockReturnValue(false);
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath,
        downloadResource,
      });

      await gitHubImplementation.getMediaFile('static/media/other.txt');

      expect(matchPath).toHaveBeenCalledWith('static/media/other.txt');
      expect(downloadResource).not.toHaveBeenCalled();
    });

    it('skips pointer parsing entirely when the LFS client is disabled', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const blob = makeBlob(POINTER);
      gitHubImplementation.api = {
        repo: 'owner/repo',
        readFile: jest.fn().mockResolvedValue(blob),
      };
      const matchPath = jest.fn();
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: false,
        matchPath,
        downloadResource: jest.fn(),
      });

      await gitHubImplementation.getMediaFile('static/media/large.bin');

      expect(matchPath).not.toHaveBeenCalled();
    });
  });

  describe('persistMedia', () => {
    it('uploads a tracked file via LFS and commits its pointer file', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const persistFiles = jest.fn().mockImplementation((_, files) => {
        files.forEach(file => {
          file.sha = 'pointer-sha';
        });
      });
      gitHubImplementation.api = { repo: 'owner/repo', persistFiles };

      const uploadResource = jest.fn().mockResolvedValue('resource-sha');
      const matchPath = jest.fn().mockReturnValue(true);
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath,
        uploadResource,
      });

      const fileObj = new File([new Uint8Array(5_000_000)], 'large.bin');
      const mediaFile = { fileObj, path: '/static/media/large.bin' };

      const result = await gitHubImplementation.persistMedia(mediaFile, {});

      expect(matchPath).toHaveBeenCalledWith('static/media/large.bin');
      expect(uploadResource).toHaveBeenCalled();
      expect(persistFiles).toHaveBeenCalledTimes(1);
      const [, persistedFiles] = persistFiles.mock.calls[0];
      // the committed blob is the pointer file, not the original fileObj
      expect(persistedFiles[0].raw).toContain('version https://git-lfs.github.com/spec/v1');
      expect(result.id).toBe('pointer-sha');
      expect(result.name).toBe('large.bin');
      expect(result.size).toBe(5_000_000);
      expect(result.path).toBe('static/media/large.bin');
    });

    it('persists a non-tracked file normally, without touching the LFS client', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const persistFiles = jest.fn().mockImplementation((_, files) => {
        files.forEach((file, index) => {
          file.sha = index;
        });
      });
      gitHubImplementation.api = { repo: 'owner/repo', persistFiles };

      const uploadResource = jest.fn();
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath: jest.fn().mockReturnValue(false),
        uploadResource,
      });

      const mediaFile = { fileObj: { size: 100, name: 'image.png' }, path: '/media/image.png' };
      const result = await gitHubImplementation.persistMedia(mediaFile, {});

      expect(uploadResource).not.toHaveBeenCalled();
      expect(persistFiles).toHaveBeenCalledWith([], [mediaFile], {});
      expect(result.id).toBe(0);
    });
  });

  describe('persistEntry', () => {
    it('filters entry assets through the LFS client when enabled', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const persistFiles = jest.fn().mockResolvedValue(undefined);
      gitHubImplementation.api = { repo: 'owner/repo', persistFiles };

      const matchPath = jest.fn().mockReturnValue(true);
      const uploadResource = jest.fn().mockResolvedValue('sha');
      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: true,
        matchPath,
        uploadResource,
      });

      const fileObj = new File([new Uint8Array(1000)], 'a.bin');
      const entry = {
        dataFiles: [{ path: 'content/post.md', slug: 'post', raw: '---\n---\n' }],
        assets: [{ path: '/static/media/a.bin', fileObj }],
      };

      await gitHubImplementation.persistEntry(entry, {});

      expect(uploadResource).toHaveBeenCalled();
      expect(persistFiles).toHaveBeenCalledTimes(1);
      const [dataFiles, mediaFiles] = persistFiles.mock.calls[0];
      expect(dataFiles).toBe(entry.dataFiles);
      expect(mediaFiles[0].raw).toContain('version https://git-lfs.github.com/spec/v1');
    });

    it('passes entry assets through unchanged when the LFS client is disabled', async () => {
      const gitHubImplementation = new GitHubImplementation(config);
      const persistFiles = jest.fn().mockResolvedValue(undefined);
      gitHubImplementation.api = { repo: 'owner/repo', persistFiles };

      gitHubImplementation.getLargeMediaClient = jest.fn().mockResolvedValue({
        enabled: false,
        matchPath: jest.fn(),
        uploadResource: jest.fn(),
      });

      const entry = {
        dataFiles: [{ path: 'content/post.md', slug: 'post', raw: '---\n---\n' }],
        assets: [{ path: '/static/media/a.png', fileObj: { size: 10, name: 'a.png' } }],
      };

      await gitHubImplementation.persistEntry(entry, {});

      expect(persistFiles).toHaveBeenCalledWith(entry.dataFiles, entry.assets, {});
    });
  });
});

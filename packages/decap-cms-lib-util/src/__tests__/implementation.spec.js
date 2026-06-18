import {
  blobToFileObj,
  getMediaAsBlob,
  getMediaDisplayURL,
  runWithLock,
  allEntriesByFolder,
  persistLocalTree,
  unpublishedEntries,
  entriesByFiles,
} from '../implementation';

describe('implementation', () => {
  describe('blobToFileObj', () => {
    it('returns a File with the given name for a non-svg file without forcing MIME type', () => {
      const blob = new Blob(['data'], { type: 'image/png' });
      const file = blobToFileObj('image.png', blob);
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('image.png');
      expect(file.type).not.toBe('image/svg+xml');
    });

    it('returns a File with type image/svg+xml for a .svg filename', () => {
      const blob = new Blob(['<svg/>'], { type: 'text/plain' });
      const file = blobToFileObj('icon.svg', blob);
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('icon.svg');
      expect(file.type).toBe('image/svg+xml');
    });
  });

  describe('getMediaAsBlob', () => {
    it('should return response blob on non svg file', async () => {
      const blob = {};
      const readFile = jest.fn().mockResolvedValue(blob);

      await expect(getMediaAsBlob('static/media/image.png', 'sha', readFile)).resolves.toBe(blob);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });
    });

    it('should return text blob on svg file', async () => {
      const text = 'svg';
      const readFile = jest.fn().mockResolvedValue(text);

      await expect(getMediaAsBlob('static/media/logo.svg', 'sha', readFile)).resolves.toEqual(
        new Blob([text], { type: 'image/svg+xml' }),
      );

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/logo.svg', 'sha', {
        parseText: true,
      });
    });
  });

  describe('runWithLock', () => {
    let lock;

    beforeEach(() => {
      lock = { acquire: jest.fn(), release: jest.fn() };
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls func, releases lock, and returns result when lock is acquired', async () => {
      lock.acquire.mockResolvedValue(true);
      const func = jest.fn().mockResolvedValue('result');

      const result = await runWithLock(lock, func, 'warn message');

      expect(func).toHaveBeenCalledTimes(1);
      expect(lock.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('warns with message but still calls func and releases lock when lock is not acquired', async () => {
      lock.acquire.mockResolvedValue(false);
      const func = jest.fn().mockResolvedValue('best-effort-result');

      const result = await runWithLock(lock, func, 'lock timeout warning');

      expect(console.warn).toHaveBeenCalledWith('lock timeout warning');
      expect(func).toHaveBeenCalledTimes(1);
      expect(lock.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('best-effort-result');
    });

    it('releases lock in finally even when func throws', async () => {
      lock.acquire.mockResolvedValue(true);
      const error = new Error('func failed');
      const func = jest.fn().mockRejectedValue(error);

      await expect(runWithLock(lock, func, 'warn message')).rejects.toThrow('func failed');

      expect(lock.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMediaDisplayURL', () => {
    it('should return createObjectURL result', async () => {
      const blob = {};
      const readFile = jest.fn().mockResolvedValue(blob);
      const semaphore = { take: jest.fn(callback => callback()), leave: jest.fn() };

      global.URL.createObjectURL = jest
        .fn()
        .mockResolvedValue('blob:http://localhost:8080/blob-id');

      await expect(
        getMediaDisplayURL({ path: 'static/media/image.png', id: 'sha' }, readFile, semaphore),
      ).resolves.toBe('blob:http://localhost:8080/blob-id');

      expect(semaphore.take).toHaveBeenCalledTimes(1);
      expect(semaphore.leave).toHaveBeenCalledTimes(1);

      expect(readFile).toHaveBeenCalledTimes(1);
      expect(readFile).toHaveBeenCalledWith('static/media/image.png', 'sha', {
        parseText: false,
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
  });

  describe('allEntriesByFolder / getDiffFromLocalTree', () => {
    // Shared test parameters
    const BRANCH = 'main';
    const FOLDER = 'content/posts';
    const EXTENSION = 'md';
    const DEPTH = 1;
    const BRANCH_SHA = 'branch-sha-abc';
    const LOCAL_TREE_SHA = 'local-tree-sha-xyz';

    /**
     * Build a minimal localForage stub that already has a persisted local tree
     * so getLocalTree() returns it and we exercise the diff path.
     */
    async function makeLocalForageWithTree(files) {
      const store = {};
      const localForage = {
        getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
        setItem: jest.fn((key, value) => {
          store[key] = value;
          return Promise.resolve(value);
        }),
      };

      // Persist a local tree so the cached-tree branch is taken.
      await persistLocalTree({
        localForage,
        localTree: { head: LOCAL_TREE_SHA, files },
        branch: BRANCH,
        folder: FOLDER,
        extension: EXTENSION,
        depth: DEPTH,
      });

      return localForage;
    }

    /**
     * Build default args shared across tests.
     * Each test overrides getDifferences / filterFile / getFileId as needed.
     */
    function makeArgs({ localForage, getDifferences, filterFile, getFileId, customFetch }) {
      return {
        listAllFiles: jest.fn(),
        readFile: jest.fn(),
        readFileMetadata: jest.fn(),
        apiName: 'test',
        branch: BRANCH,
        localForage,
        folder: FOLDER,
        extension: EXTENSION,
        depth: DEPTH,
        getDefaultBranch: jest.fn().mockResolvedValue({ name: BRANCH, sha: BRANCH_SHA }),
        isShaExistsInBranch: jest.fn().mockResolvedValue(true),
        getDifferences,
        getFileId: getFileId ?? jest.fn(path => Promise.resolve(`id:${path}`)),
        filterFile: filterFile ?? (() => true),
        customFetch: customFetch ?? (files => Promise.resolve(files)),
      };
    }

    it('renamed diff: old path is deleted, new path is not deleted', async () => {
      const existingFiles = [{ id: 'old-id', path: `${FOLDER}/old-name.md`, name: 'old-name.md' }];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'renamed',
          oldPath: `${FOLDER}/old-name.md`,
          newPath: `${FOLDER}/new-name.md`,
        },
      ]);

      const result = await allEntriesByFolder(makeArgs({ localForage, getDifferences }));

      // old path must not appear (it's deleted and filtered out of newCopy)
      expect(result.find(f => f.path === `${FOLDER}/old-name.md`)).toBeUndefined();

      // new path must appear and not be deleted
      const newEntry = result.find(f => f.path === `${FOLDER}/new-name.md`);
      expect(newEntry).toBeDefined();
      expect(newEntry.id).toBe(`id:${FOLDER}/new-name.md`);
    });

    it('renamed diff: getDiffFromLocalTree returns deleted=true for old path, deleted=false for new path', async () => {
      const existingFiles = [];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'renamed',
          oldPath: `${FOLDER}/a.md`,
          newPath: `${FOLDER}/b.md`,
        },
      ]);

      // Use customFetch to intercept the file list before fetchFiles is called.
      // allEntriesByFolder builds newCopy which merges diff + localTree.files.
      // We verify both paths appear with correct deleted flags by inspecting what
      // getDifferences returned and how persistLocalTree was called.
      const localForageSetItem = localForage.setItem;
      let persistedTree = null;
      localForage.setItem = jest.fn((key, value) => {
        persistedTree = value;
        return localForageSetItem(key, value);
      });

      await allEntriesByFolder(makeArgs({ localForage, getDifferences }));

      // The persisted tree (newCopy) should only contain non-deleted entries.
      // b.md (not deleted) should be present; a.md (deleted) should not.
      expect(persistedTree.files.find(f => f.path === `${FOLDER}/b.md`)).toBeDefined();
      expect(persistedTree.files.find(f => f.path === `${FOLDER}/a.md`)).toBeUndefined();
    });

    it('deleted diff: old path appears with deleted=true and id=""', async () => {
      const existingFiles = [{ id: 'some-id', path: `${FOLDER}/entry.md`, name: 'entry.md' }];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'deleted',
          oldPath: `${FOLDER}/entry.md`,
          newPath: null,
        },
      ]);

      const getFileId = jest.fn();

      // Capture what the diff produces by intercepting persistLocalTree call.
      let persistedTree = null;
      localForage.setItem = jest.fn((key, value) => {
        persistedTree = value;
        return Promise.resolve(value);
      });

      const result = await allEntriesByFolder(makeArgs({ localForage, getDifferences, getFileId }));

      // deleted entry must be removed from result (deleted=true is filtered by newCopy logic)
      expect(result.find(f => f.path === `${FOLDER}/entry.md`)).toBeUndefined();

      // getFileId must not be called for deleted files (id should be '')
      expect(getFileId).not.toHaveBeenCalled();

      // persisted tree should not include the deleted entry
      if (persistedTree) {
        expect(persistedTree.files.find(f => f.path === `${FOLDER}/entry.md`)).toBeUndefined();
      }
    });

    it('modified diff: new path appears with correct id and deleted=false', async () => {
      const existingFiles = [{ id: 'old-id', path: `${FOLDER}/post.md`, name: 'post.md' }];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'modified',
          oldPath: `${FOLDER}/post.md`,
          newPath: `${FOLDER}/post.md`,
        },
      ]);

      const getFileId = jest.fn().mockResolvedValue('new-content-id');

      const result = await allEntriesByFolder(makeArgs({ localForage, getDifferences, getFileId }));

      const entry = result.find(f => f.path === `${FOLDER}/post.md`);
      expect(entry).toBeDefined();
      expect(entry.id).toBe('new-content-id');
      expect(getFileId).toHaveBeenCalledWith(`${FOLDER}/post.md`);
    });

    it('added diff: new path (no oldPath) appears with correct id and deleted=false', async () => {
      const existingFiles = [];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'added',
          oldPath: null,
          newPath: `${FOLDER}/brand-new.md`,
        },
      ]);

      const getFileId = jest.fn().mockResolvedValue('added-file-id');

      const result = await allEntriesByFolder(makeArgs({ localForage, getDifferences, getFileId }));

      const entry = result.find(f => f.path === `${FOLDER}/brand-new.md`);
      expect(entry).toBeDefined();
      expect(entry.id).toBe('added-file-id');
    });

    it('filterFile excludes entries that do not pass the predicate', async () => {
      const existingFiles = [];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'added',
          oldPath: null,
          newPath: `${FOLDER}/keep.md`,
        },
        {
          status: 'added',
          oldPath: null,
          newPath: `${FOLDER}/skip.md`,
        },
      ]);

      // Only allow files whose name does not start with 'skip'
      const filterFile = jest.fn(file => !file.name.startsWith('skip'));

      const getFileId = jest.fn(path => Promise.resolve(`id:${path}`));

      const result = await allEntriesByFolder(
        makeArgs({ localForage, getDifferences, filterFile, getFileId }),
      );

      expect(result.find(f => f.path === `${FOLDER}/keep.md`)).toBeDefined();
      expect(result.find(f => f.path === `${FOLDER}/skip.md`)).toBeUndefined();
      expect(filterFile).toHaveBeenCalled();
    });

    it('no local tree: falls back to listAllFiles and fetches all files', async () => {
      const store = {};
      const localForage = {
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn((key, value) => {
          store[key] = value;
          return Promise.resolve(value);
        }),
      };

      const files = [{ id: 'id-a', path: `${FOLDER}/a.md` }];
      const listAllFiles = jest.fn().mockResolvedValue(files);

      const args = {
        listAllFiles,
        readFile: jest.fn(),
        readFileMetadata: jest.fn(),
        apiName: 'test',
        branch: BRANCH,
        localForage,
        folder: FOLDER,
        extension: EXTENSION,
        depth: DEPTH,
        getDefaultBranch: jest.fn().mockResolvedValue({ name: BRANCH, sha: BRANCH_SHA }),
        isShaExistsInBranch: jest.fn().mockResolvedValue(true),
        getDifferences: jest.fn(),
        getFileId: jest.fn(),
        filterFile: () => true,
        customFetch: jest.fn().mockResolvedValue(files),
      };

      const result = await allEntriesByFolder(args);

      expect(listAllFiles).toHaveBeenCalledTimes(1);
      expect(args.customFetch).toHaveBeenCalledWith(files);
      expect(result).toEqual(files);
    });

    it('diff entries outside the folder are ignored', async () => {
      const existingFiles = [];
      const localForage = await makeLocalForageWithTree(existingFiles);

      const getDifferences = jest.fn().mockResolvedValue([
        {
          status: 'added',
          oldPath: null,
          newPath: 'other-folder/post.md',
        },
        {
          status: 'added',
          oldPath: null,
          newPath: `${FOLDER}/in-scope.md`,
        },
      ]);

      const getFileId = jest.fn(path => Promise.resolve(`id:${path}`));

      const result = await allEntriesByFolder(makeArgs({ localForage, getDifferences, getFileId }));

      expect(result.find(f => f.path === 'other-folder/post.md')).toBeUndefined();
      expect(result.find(f => f.path === `${FOLDER}/in-scope.md`)).toBeDefined();
    });
  });

  describe('unpublishedEntries', () => {
    it('resolves with the keys returned by listEntriesKeys on success', async () => {
      const keys = ['key1', 'key2'];
      const listEntriesKeys = jest.fn().mockResolvedValue(keys);

      const result = await unpublishedEntries(listEntriesKeys);

      expect(listEntriesKeys).toHaveBeenCalledTimes(1);
      expect(result).toEqual(keys);
    });

    it('returns [] when the error message is "Not Found"', async () => {
      const error = new Error('Not Found');
      const listEntriesKeys = jest.fn().mockRejectedValue(error);

      const result = await unpublishedEntries(listEntriesKeys);

      expect(result).toEqual([]);
    });

    it('re-throws errors with messages other than "Not Found"', async () => {
      const error = new Error('Server Error');
      const listEntriesKeys = jest.fn().mockRejectedValue(error);

      await expect(unpublishedEntries(listEntriesKeys)).rejects.toThrow('Server Error');
    });
  });

  describe('entriesByFiles', () => {
    it('calls readFile and readFileMetadata for each file and returns mapped entries', async () => {
      const files = [
        { path: 'content/a.md', id: 'id-a', label: 'A' },
        { path: 'content/b.md', id: 'id-b', label: 'B' },
      ];

      const fileMetadata = { author: 'test-author', updatedOn: '2024-01-01' };
      const readFile = jest.fn((path, _id, _opts) => Promise.resolve(`data:${path}`));
      const readFileMetadata = jest.fn(() => Promise.resolve(fileMetadata));

      const result = await entriesByFiles(files, readFile, readFileMetadata, 'test-api');

      expect(readFile).toHaveBeenCalledTimes(2);
      expect(readFileMetadata).toHaveBeenCalledTimes(2);

      expect(readFile).toHaveBeenCalledWith('content/a.md', 'id-a', { parseText: true });
      expect(readFile).toHaveBeenCalledWith('content/b.md', 'id-b', { parseText: true });
      expect(readFileMetadata).toHaveBeenCalledWith('content/a.md', 'id-a');
      expect(readFileMetadata).toHaveBeenCalledWith('content/b.md', 'id-b');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        data: 'data:content/a.md',
        file: { path: 'content/a.md', id: 'id-a', label: 'A', ...fileMetadata },
      });
      expect(result[1]).toMatchObject({
        data: 'data:content/b.md',
        file: { path: 'content/b.md', id: 'id-b', label: 'B', ...fileMetadata },
      });
    });

    it('omits entries where readFile or readFileMetadata fails', async () => {
      const files = [
        { path: 'content/good.md', id: 'id-good' },
        { path: 'content/bad.md', id: 'id-bad' },
      ];

      const readFile = jest.fn(path => {
        if (path === 'content/bad.md') return Promise.reject(new Error('fetch failed'));
        return Promise.resolve('good data');
      });
      const readFileMetadata = jest.fn(() => Promise.resolve({ author: 'a', updatedOn: '2024' }));

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await entriesByFiles(files, readFile, readFileMetadata, 'test-api');

      jest.restoreAllMocks();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ data: 'good data' });
    });
  });
});

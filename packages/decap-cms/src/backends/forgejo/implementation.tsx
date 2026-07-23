import { trimStart } from 'lodash-es';

import { stripIndent } from '@/lib/util/index';
import {
  asyncLock,
  basename,
  blobToFileObj,
  branchFromContentKey,
  contentKeyFromBranch,
  createSemaphore,
  Cursor,
  CURSOR_COMPATIBILITY_SYMBOL,
  entriesByFiles,
  entriesByFolder,
  filterByExtension,
  getBlobSHA,
  getMediaAsBlob,
  getMediaDisplayURL,
  runWithLock,
  unpublishedEntries,
  unsentRequest,
} from '@/lib/util/index';
import API, { API_NAME } from './API';
import AuthenticationPage from './AuthenticationPage';

import type {
  AsyncLock,
  CmsAssetProxy,
  CmsBackendInitConfig,
  CmsCredentials,
  CmsDisplayURL,
  CmsFileEntry,
  CmsImplementation,
  CmsImplementationEntry,
  CmsImplementationFile,
  CmsPersistOptions,
  CmsUser,
  CursorCompatibleEntries,
  Semaphore,
} from '@/lib/util/index';
import type { ForgejoUser } from './types';

const MAX_CONCURRENT_DOWNLOADS = 10;

type ApiFile = { id: string, type: string, name: string, path: string, size: number };

const { fetchWithTimeout: fetch } = unsentRequest;

export default class Forgejo implements CmsImplementation {
  lock: AsyncLock;
  api: API | null;
  options: {
    proxied: boolean,
    API: API | null,
    useWorkflow?: boolean,
    initialWorkflowStatus?: string,
  };
  originRepo: string;
  repo?: string;
  branch: string;
  apiRoot: string;
  mediaFolder?: string;
  token: string | null;
  cmsLabelPrefix: string;
  initialWorkflowStatus: string;
  _currentUserPromise?: Promise<ForgejoUser>;
  _userIsOriginMaintainerPromises?: {
    [key: string]: Promise<boolean>,
  };
  _mediaDisplayURLSem?: Semaphore;

  constructor(config: CmsBackendInitConfig, options = {}) {
    this.options = {
      proxied: false,
      API: null,
      useWorkflow: false,
      initialWorkflowStatus: '',
      ...options,
    };

    if (
      !this.options.proxied
      && (config.backend.repo === null || config.backend.repo === undefined)
    ) {
      throw new Error('The Forgejo backend needs a "repo" in the backend configuration.');
    }

    if (!this.options.proxied && !config.backend.api_root) {
      throw new Error(
        'The Forgejo backend needs an "api_root" in the backend configuration.',
      );
    }

    this.api = this.options.API || null;
    this.repo = this.originRepo = config.backend.repo || '';
    this.branch = config.backend.branch?.trim() || 'main';
    this.apiRoot = config.backend.api_root || 'https://codeberg.org/api/v1';
    this.token = '';
    this.mediaFolder = config.media_folder ?? '';
    this.cmsLabelPrefix = config.backend.cms_label_prefix || '';
    this.initialWorkflowStatus = this.options.initialWorkflowStatus || 'draft';
    this.lock = asyncLock();
  }

  isGitBackend() {
    return true;
  }

  async status() {
    const auth = (await this.api
      ?.user()
      .then(user => !!user)
      .catch(e => {
        console.warn('[StaticCMS] Failed getting Forgejo user', e);
        return false;
      })) || false;

    return { auth: { status: auth }, api: { status: true, statusPage: '' } };
  }

  authComponent() {
    return AuthenticationPage;
  }

  restoreUser(user: CmsUser) {
    return this.authenticate(user);
  }

  async currentUser({ token }: { token: string }) {
    if (!this._currentUserPromise) {
      this._currentUserPromise = fetch(`${this.apiRoot}/user`, {
        headers: {
          Authorization: `token ${token}`,
        },
      }).then(res => res.json());
    }
    return this._currentUserPromise;
  }

  async userIsOriginMaintainer({
    username: usernameArg,
    token,
  }: {
    username?: string,
    token: string,
  }) {
    const username = usernameArg || (await this.currentUser({ token })).login;
    this._userIsOriginMaintainerPromises = this._userIsOriginMaintainerPromises || {};
    if (!this._userIsOriginMaintainerPromises[username]) {
      this._userIsOriginMaintainerPromises[username] = fetch(
        `${this.apiRoot}/repos/${this.originRepo}/collaborators/${username}/permission`,
        {
          headers: {
            Authorization: `token ${token}`,
          },
        },
      )
        .then(res => res.json())
        .then(({ permission }) => permission === 'admin' || permission === 'write');
    }
    return this._userIsOriginMaintainerPromises[username];
  }

  async authenticate(state: CmsCredentials) {
    this.token = state.token as string;
    const apiCtor = API;
    this.api = new apiCtor({
      token: this.token,
      branch: this.branch,
      repo: this.repo,
      originRepo: this.originRepo,
      apiRoot: this.apiRoot,
      cmsLabelPrefix: this.cmsLabelPrefix,
      initialWorkflowStatus: this.initialWorkflowStatus,
    });
    const user = await this.api!.user();
    const isCollab = await this.api!.hasWriteAccess().catch(error => {
      error.message = stripIndent`
        Repo "${this.repo}" not found.

        Please ensure the repo information is spelled correctly.

        If the repo is private, make sure you're logged into a Forgejo account with access.

        If your repo is under an organization, ensure the organization has granted access to Decap
        CMS.
      `;
      throw error;
    });

    // Unauthorized user
    if (!isCollab) {
      throw new Error('Your Forgejo user account does not have access to this repo.');
    }

    // Authorized user
    return {
      name: user.full_name,
      login: user.login,
      email: user.email,
      avatar_url: user.avatar_url,
      token: state.token as string,
    };
  }

  logout() {
    this.token = null;
    if (this.api && this.api.reset && typeof this.api.reset === 'function') {
      return this.api.reset();
    }
  }

  getToken() {
    return Promise.resolve(this.token);
  }

  getCursorAndFiles = (files: ApiFile[], page: number) => {
    const pageSize = 20;
    const count = files.length;
    const pageCount = Math.ceil(files.length / pageSize);

    const actions = [] as string[];
    if (page > 1) {
      actions.push('prev');
      actions.push('first');
    }
    if (page < pageCount) {
      actions.push('next');
      actions.push('last');
    }

    const cursor = Cursor.create({
      actions,
      meta: { page, count, pageSize, pageCount },
      data: { files },
    });
    const pageFiles = files.slice((page - 1) * pageSize, page * pageSize);
    return { cursor, files: pageFiles };
  };

  async entriesByFolder(folder: string, extension: string, depth: number) {
    const repoURL = this.api!.originRepoURL;

    let cursor: Cursor;

    const listFiles = () =>
      this.api!.listFiles(folder, {
        repoURL,
        depth,
      }).then(files => {
        const filtered = files.filter(file => filterByExtension(file, extension));
        const result = this.getCursorAndFiles(filtered, 1);
        cursor = result.cursor;
        return result.files;
      });

    const readFile = (path: string, id: string | null | undefined) =>
      this.api!.readFile(path, id, { repoURL }) as Promise<string>;

    const files = await entriesByFolder(
      listFiles,
      readFile,
      this.api!.readFileMetadata.bind(this.api),
      API_NAME,
    );

    (files as CursorCompatibleEntries<CmsImplementationEntry>)[CURSOR_COMPATIBILITY_SYMBOL] = cursor!;
    return files;
  }

  async allEntriesByFolder(folder: string, extension: string, depth: number) {
    const repoURL = this.api!.originRepoURL;

    const listFiles = () =>
      this.api!.listFiles(folder, {
        repoURL,
        depth,
      }).then(files => files.filter(file => filterByExtension(file, extension)));

    const readFile = (path: string, id: string | null | undefined) => {
      return this.api!.readFile(path, id, { repoURL }) as Promise<string>;
    };

    const files = await entriesByFolder(
      listFiles,
      readFile,
      this.api!.readFileMetadata.bind(this.api),
      API_NAME,
    );
    return files;
  }

  entriesByFiles(files: CmsImplementationFile[]) {
    const repoURL = this.api!.repoURL;

    const readFile = (path: string, id: string | null | undefined) =>
      this.api!.readFile(path, id, { repoURL }).catch(() => '') as Promise<string>;

    return entriesByFiles(files, readFile, this.api!.readFileMetadata.bind(this.api), API_NAME);
  }

  // Fetches a single entry.
  getEntry(path: string) {
    const repoURL = this.api!.originRepoURL;
    return this.api!.readFile(path, null, { repoURL })
      .then(data => ({
        file: { path, id: null },
        data: data as string,
      }))
      .catch(() => ({ file: { path, id: null }, data: '' }));
  }

  async getMedia(mediaFolder = this.mediaFolder, folderSupport?: boolean) {
    if (!mediaFolder) {
      return [];
    }
    return this.api!.listFiles(mediaFolder, undefined, folderSupport).then(files =>
      files.map(({ id, name, size, path, type }) => {
        return { id, name, size, displayURL: { id, path }, path, isDirectory: type === 'tree' };
      })
    );
  }

  async getMediaFile(path: string) {
    const blob = await getMediaAsBlob(path, null, this.api!.readFile.bind(this.api!));

    const name = basename(path);
    const fileObj = blobToFileObj(name, blob);
    const url = URL.createObjectURL(fileObj);
    const id = await getBlobSHA(blob);

    return {
      id,
      displayURL: url,
      path,
      name,
      size: fileObj.size,
      file: fileObj,
      url,
    };
  }

  getMediaDisplayURL(displayURL: CmsDisplayURL) {
    this._mediaDisplayURLSem = this._mediaDisplayURLSem || createSemaphore(MAX_CONCURRENT_DOWNLOADS);
    return getMediaDisplayURL(
      displayURL,
      this.api!.readFile.bind(this.api!),
      this._mediaDisplayURLSem,
    );
  }

  persistEntry(entry: CmsFileEntry, options: CmsPersistOptions) {
    // persistEntry is a transactional operation
    return runWithLock(
      this.lock,
      () => {
        if (options.useWorkflow) {
          const slug = entry.dataFiles[0].slug;
          const collection = options.collectionName as string;
          const files = [...entry.dataFiles, ...entry.assets];
          return this.api!.editorialWorkflowGit(files, slug, collection, options);
        }
        return this.api!.persistFiles(entry.dataFiles, entry.assets, options);
      },
      'Failed to acquire persist entry lock',
    );
  }

  async persistMedia(mediaFile: CmsAssetProxy, options: CmsPersistOptions) {
    try {
      await this.api!.persistFiles([], [mediaFile], options);
      const { sha, path, fileObj } = mediaFile as CmsAssetProxy & { sha: string };
      const displayURL = URL.createObjectURL(fileObj as Blob);
      return {
        id: sha,
        name: fileObj!.name,
        size: fileObj!.size,
        displayURL,
        path: trimStart(path, '/'),
      };
    } catch (error: unknown) {
      console.error(error);
      throw error;
    }
  }

  async deleteFiles(paths: string[], commitMessage: string): Promise<void> {
    await this.api!.deleteFiles(paths, commitMessage);
  }

  async traverseCursor(cursor: Cursor, action: string) {
    const meta = cursor.meta!;
    const files = cursor.data!['files'] as ApiFile[];

    let result: { cursor: Cursor, files: ApiFile[] };
    switch (action) {
      case 'first': {
        result = this.getCursorAndFiles(files, 1);
        break;
      }
      case 'last': {
        result = this.getCursorAndFiles(files, meta['pageCount'] as number);
        break;
      }
      case 'next': {
        result = this.getCursorAndFiles(files, (meta['page'] as number) + 1);
        break;
      }
      case 'prev': {
        result = this.getCursorAndFiles(files, (meta['page'] as number) - 1);
        break;
      }
      default: {
        result = this.getCursorAndFiles(files, 1);
        break;
      }
    }

    const readFile = (path: string, id: string | null | undefined) =>
      this.api!.readFile(path, id, { repoURL: this.api!.originRepoURL }).catch(
        () => '',
      ) as Promise<string>;

    const entries = await entriesByFiles(
      result.files,
      readFile,
      this.api!.readFileMetadata.bind(this.api),
      API_NAME,
    );

    return {
      entries,
      cursor: result.cursor,
    };
  }

  async unpublishedEntries(): Promise<string[]> {
    if (!this.options.useWorkflow) {
      return [];
    }
    const listEntriesKeys = () =>
      this.api!.listUnpublishedBranches().then(branches =>
        branches.map(branch => contentKeyFromBranch(branch))
      );

    const ids = await unpublishedEntries(listEntriesKeys);
    return ids;
  }

  async unpublishedEntry(args: { id?: string, collection?: string, slug?: string }) {
    const { id, collection, slug } = args;
    if (id) {
      return this.api!.retrieveUnpublishedEntryData(id);
    } else if (collection && slug) {
      const contentKey = this.api!.generateContentKey(collection, slug);
      return this.api!.retrieveUnpublishedEntryData(contentKey);
    } else {
      throw new Error('Missing unpublished entry id or collection and slug');
    }
  }

  async unpublishedEntryDataFile(
    collection: string,
    slug: string,
    path: string,
    id: string,
  ): Promise<string> {
    const contentKey = this.api!.generateContentKey(collection, slug);
    const branch = branchFromContentKey(contentKey);
    const data = (await this.api!.readFile(path, id, { branch })) as string;
    return data;
  }

  async unpublishedEntryMediaFile(collection: string, slug: string, path: string, id: string) {
    const contentKey = this.api!.generateContentKey(collection, slug);
    const branch = branchFromContentKey(contentKey);
    const blob = (await this.api!.readFile(path, id, { branch, parseText: false })) as Blob;
    const name = basename(path);
    const fileObj = blobToFileObj(name, blob);
    return {
      id,
      name,
      path,
      size: fileObj.size,
      displayURL: URL.createObjectURL(fileObj),
      file: fileObj,
    };
  }

  updateUnpublishedEntryStatus(collection: string, slug: string, newStatus: string) {
    return runWithLock(
      this.lock,
      () => this.api!.updateUnpublishedEntryStatus(collection, slug, newStatus),
      'Failed to acquire update entry status lock',
    );
  }

  publishUnpublishedEntry(collection: string, slug: string) {
    return runWithLock(
      this.lock,
      () => this.api!.publishUnpublishedEntry(collection, slug),
      'Failed to acquire publish entry lock',
    );
  }

  deleteUnpublishedEntry(collection: string, slug: string) {
    return runWithLock(
      this.lock,
      () => this.api!.deleteUnpublishedEntry(collection, slug),
      'Failed to acquire delete entry lock',
    );
  }

  async getDeployPreview(
    _collectionName: string,
    _slug: string,
  ): Promise<{ url: string, status: string } | null> {
    return null;
  }
}

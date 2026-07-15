import { attempt, isEmpty, isError, take, unset } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import {
  EditorialWorkflowError,
  Cursor,
  CURSOR_COMPATIBILITY_SYMBOL,
  basename,
  extname,
  dirname,
  ConfigurationError,
} from '@/lib/util/index';
import AuthenticationPage from './AuthenticationPage';

import type {
  CmsImplementation,
  CmsEntry,
  CmsImplementationEntry,
  CmsAssetProxy,
  CmsPersistOptions,
  CmsUser,
  CmsConfig,
  CmsImplementationFile,
  CmsDataFile,
  CursorCompatibleEntries,
} from '@/lib/util/index';
import type { CmsFileEntry, CmsImplementationMediaFile } from '@/lib/util/index';

type RepoFile = { path: string; content: string | CmsAssetProxy };
type RepoTree = { [key: string]: RepoFile | RepoTree };

type Diff = {
  id: string;
  originalPath?: string;
  path: string;
  newFile: boolean;
  status: string;
  content: string | CmsAssetProxy;
};

type UnpublishedRepoEntry = {
  slug: string;
  collection: string;
  status: string;
  diffs: Diff[];
  updatedAt: string;
};

declare global {
  interface Window {
    repoFiles: RepoTree;
    repoFilesUnpublished: { [key: string]: UnpublishedRepoEntry };
  }
}

window.repoFiles = window.repoFiles || {};
window.repoFilesUnpublished = window.repoFilesUnpublished || [];

function getFile(path: string, tree: RepoTree) {
  const segments = path.split('/');
  let obj: RepoTree = tree;
  while (obj && segments.length) {
    obj = obj[segments.shift() as string] as RepoTree;
  }
  return (obj as unknown as RepoFile) || {};
}

function writeFile(path: string, content: string | CmsAssetProxy, tree: RepoTree) {
  const segments = path.split('/');
  let obj = tree;
  while (segments.length > 1) {
    const segment = segments.shift() as string;
    obj[segment] = obj[segment] || {};
    obj = obj[segment] as RepoTree;
  }
  (obj[segments.shift() as string] as RepoFile) = { content, path };
}

function deleteFile(path: string, tree: RepoTree) {
  unset(tree, path.split('/'));
}

const pageSize = 10;

function getCursor(
  folder: string,
  extension: string,
  entries: CmsImplementationEntry[],
  index: number,
  depth: number,
) {
  const count = entries.length;
  const pageCount = Math.floor(count / pageSize);
  return Cursor.create({
    actions: [
      ...(index < pageCount ? ['next', 'last'] : []),
      ...(index > 0 ? ['prev', 'first'] : []),
    ],
    meta: { index, count, pageSize, pageCount },
    data: { folder, extension, index, pageCount, depth },
  });
}

export function getFolderFiles(
  tree: RepoTree,
  folder: string,
  extension: string,
  depth: number,
  files = [] as RepoFile[],
  path = folder,
) {
  if (depth <= 0) {
    return files;
  }

  Object.keys(tree[folder] || {}).forEach(key => {
    if (extname(key)) {
      const file = (tree[folder] as RepoTree)[key] as RepoFile;
      if (!extension || key.endsWith(`.${extension}`)) {
        files.unshift({ content: file.content, path: `${path}/${key}` });
      }
    } else {
      const subTree = tree[folder] as RepoTree;
      return getFolderFiles(subTree, key, extension, depth - 1, files, `${path}/${key}`);
    }
  });

  return files;
}

export default class TestBackend implements CmsImplementation {
  mediaFolder: string;
  options: { initialWorkflowStatus?: string };

  constructor(config: CmsConfig, options = {}) {
    this.options = options;
    if (!config.media_folder) {
      throw new ConfigurationError(
        'The media_folder configuration is required for the Test Backend',
      );
    }
    this.mediaFolder = config.media_folder;
  }

  isGitBackend() {
    return false;
  }

  status() {
    return Promise.resolve({ auth: { status: true }, api: { status: true, statusPage: '' } });
  }

  authComponent() {
    return AuthenticationPage;
  }

  restoreUser() {
    return this.authenticate();
  }

  authenticate() {
    return Promise.resolve() as unknown as Promise<CmsUser>;
  }

  logout() {
    return null;
  }

  getToken() {
    return Promise.resolve('');
  }

  traverseCursor(cursor: Cursor, action: string) {
    const { folder, extension, index, pageCount, depth } = cursor.data as {
      folder: string;
      extension: string;
      index: number;
      pageCount: number;
      depth: number;
    };
    const newIndex = (() => {
      if (action === 'next') {
        return (index as number) + 1;
      }
      if (action === 'prev') {
        return (index as number) - 1;
      }
      if (action === 'first') {
        return 0;
      }
      if (action === 'last') {
        return pageCount;
      }
      return 0;
    })();
    // TODO: stop assuming cursors are for collections
    const allFiles = getFolderFiles(window.repoFiles, folder, extension, depth);
    const allEntries = allFiles.map(f => ({
      data: f.content as string,
      file: { path: f.path, id: f.path },
    }));
    const entries = allEntries.slice(newIndex * pageSize, newIndex * pageSize + pageSize);
    const newCursor = getCursor(folder, extension, allEntries, newIndex, depth);
    return Promise.resolve({ entries, cursor: newCursor });
  }

  entriesByFolder(folder: string, extension: string, depth: number) {
    const files = folder ? getFolderFiles(window.repoFiles, folder, extension, depth) : [];
    const entries = files.map(f => ({
      data: f.content as string,
      file: { path: f.path, id: f.path },
    }));
    const cursor = getCursor(folder, extension, entries, 0, depth);
    const ret = take(entries, pageSize);

    (ret as CursorCompatibleEntries<CmsImplementationEntry>)[CURSOR_COMPATIBILITY_SYMBOL] = cursor;
    return Promise.resolve(ret);
  }

  entriesByFiles(files: CmsImplementationFile[]) {
    return Promise.all(
      files.map(file => ({
        file,
        data: getFile(file.path, window.repoFiles).content as string,
      })),
    );
  }

  getEntry(path: string) {
    const file = getFile(path, window.repoFiles);
    if (isEmpty(file)) {
      return Promise.reject(new Error(`Entry not found: ${path}`));
    }
    return Promise.resolve({
      file: { path, id: null },
      data: file.content as string,
    });
  }

  unpublishedEntries() {
    return Promise.resolve(Object.keys(window.repoFilesUnpublished));
  }

  unpublishedEntry({ id, collection, slug }: { id?: string; collection?: string; slug?: string }) {
    if (id) {
      const parts = id.split('/');
      collection = parts[0];
      slug = parts[1];
    }
    const entry = window.repoFilesUnpublished[`${collection}/${slug}`];
    if (!entry) {
      return Promise.reject(
        new EditorialWorkflowError('content is not under editorial workflow', true),
      );
    }

    return Promise.resolve(entry);
  }

  async unpublishedEntryDataFile(collection: string, slug: string, path: string) {
    const entry = window.repoFilesUnpublished[`${collection}/${slug}`];
    const file = entry.diffs.find(d => d.path === path);
    return file?.content as string;
  }

  async unpublishedEntryMediaFile(collection: string, slug: string, path: string) {
    const entry = window.repoFilesUnpublished[`${collection}/${slug}`];
    const file = entry.diffs.find(d => d.path === path);
    return this.normalizeAsset(file?.content as CmsAssetProxy);
  }

  deleteUnpublishedEntry(collection: string, slug: string) {
    delete window.repoFilesUnpublished[`${collection}/${slug}`];
    return Promise.resolve();
  }

  async addOrUpdateUnpublishedEntry(
    key: string,
    dataFiles: CmsDataFile[],
    assetProxies: CmsAssetProxy[],
    slug: string,
    collection: string,
    status: string,
  ) {
    const diffs: Diff[] = [];
    dataFiles.forEach(dataFile => {
      const { path, newPath, raw } = dataFile;
      const currentDataFile = window.repoFilesUnpublished[key]?.diffs.find(d => d.path === path);
      const originalPath = currentDataFile ? currentDataFile.originalPath : path;
      diffs.push({
        originalPath,
        id: newPath || path,
        path: newPath || path,
        newFile: isEmpty(getFile(originalPath as string, window.repoFiles)),
        status: 'added',
        content: raw,
      });
    });
    assetProxies.forEach(a => {
      const asset = this.normalizeAsset(a);
      diffs.push({
        id: asset.id,
        path: asset.path,
        newFile: true,
        status: 'added',
        content: asset,
      });
    });
    window.repoFilesUnpublished[key] = {
      slug,
      collection,
      status,
      diffs,
      updatedAt: new Date().toISOString(),
    };
  }

  async persistEntry(entry: CmsFileEntry, options: CmsPersistOptions) {
    if (!('dataFiles' in entry)) throw new Error('Expected entry to have dataFiles property');
    if (options.useWorkflow) {
      const slug = entry.dataFiles[0].slug;
      const key = `${options.collectionName}/${slug}`;
      const currentEntry = window.repoFilesUnpublished[key];
      const status =
        currentEntry?.status || options.status || (this.options.initialWorkflowStatus as string);

      this.addOrUpdateUnpublishedEntry(
        key,
        entry.dataFiles,
        entry.assets,
        slug,
        options.collectionName as string,
        status,
      );
      return Promise.resolve();
    }

    entry.dataFiles.forEach(dataFile => {
      const { path, raw } = dataFile;
      writeFile(path, raw, window.repoFiles);
    });
    entry.assets.forEach(a => {
      writeFile(a.path, a, window.repoFiles);
    });
    return Promise.resolve();
  }

  updateUnpublishedEntryStatus(collection: string, slug: string, newStatus: string) {
    window.repoFilesUnpublished[`${collection}/${slug}`].status = newStatus;
    return Promise.resolve();
  }

  publishUnpublishedEntry(collection: string, slug: string) {
    const key = `${collection}/${slug}`;
    const unpubEntry = window.repoFilesUnpublished[key];

    delete window.repoFilesUnpublished[key];

    const tree = window.repoFiles;
    unpubEntry.diffs.forEach(d => {
      if (d.originalPath && !d.newFile) {
        const originalPath = d.originalPath;
        const sourceDir = dirname(originalPath);
        const destDir = dirname(d.path);
        const toMove = getFolderFiles(tree, originalPath.split('/')[0], '', 100).filter(f =>
          f.path.startsWith(sourceDir),
        );
        toMove.forEach(f => {
          deleteFile(f.path, tree);
          writeFile(f.path.replace(sourceDir, destDir), f.content, tree);
        });
      }
      writeFile(d.path, d.content, tree);
    });

    return Promise.resolve();
  }

  getMedia(mediaFolder = this.mediaFolder) {
    const files = getFolderFiles(window.repoFiles, mediaFolder.split('/')[0], '', 100).filter(f =>
      f.path.startsWith(mediaFolder),
    );
    const assets = files.map(f => this.normalizeAsset(f.content as CmsAssetProxy));
    return Promise.resolve(assets);
  }

  async getMediaFile(path: string) {
    const asset = getFile(path, window.repoFiles).content as CmsAssetProxy;

    const url = asset.toString();
    const name = basename(path);
    const blob = await fetch(url).then(res => res.blob());
    const fileObj = new File([blob], name);

    return {
      id: url,
      displayURL: url,
      path,
      name,
      size: fileObj.size,
      file: fileObj,
      url,
    };
  }

  normalizeAsset(assetProxy: CmsAssetProxy): CmsImplementationMediaFile & CmsAssetProxy {
    const fileObj = assetProxy.fileObj as File;
    const { name, size } = fileObj;
    const objectUrl = attempt(window.URL.createObjectURL, fileObj);
    const url = isError(objectUrl) ? '' : objectUrl;

    const normalizedAsset = {
      id: uuid(),
      name,
      size,
      path: assetProxy.path,
      url,
      displayURL: url,
      fileObj,
      toBase64: assetProxy.toBase64,
    };

    return normalizedAsset;
  }

  persistMedia(assetProxy: CmsAssetProxy) {
    const normalizedAsset = this.normalizeAsset(assetProxy);

    writeFile(assetProxy.path, assetProxy, window.repoFiles);

    return Promise.resolve(normalizedAsset);
  }

  deleteFiles(paths: string[]) {
    paths.forEach(path => {
      deleteFile(path, window.repoFiles);
    });

    return Promise.resolve();
  }

  async getDeployPreview() {
    return null;
  }
}

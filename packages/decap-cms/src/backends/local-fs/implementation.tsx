import { basename, blobToFileObj, ConfigurationError, EditorialWorkflowError } from '@/lib/util/index';
import AuthenticationPage from './AuthenticationPage';
import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from './directoryHandleStore';
import { deleteEntry, listFiles, readFile, readFileAsString, requestPermission, writeFile } from './fsUtils';
import './types';

import type {
  CmsAssetProxy,
  CmsConfig,
  CmsFileEntry,
  CmsImplementation,
  CmsImplementationEntry,
  CmsImplementationFile,
  CmsImplementationMediaFile,
  CmsPersistOptions,
  CmsUser,
} from '@/lib/util/index';

/**
 * True when the browser exposes the (still Chromium-only) File System Access
 * API this backend needs. Callers should feature-detect with this before
 * registering/selecting the `local-fs` backend and fall back to `proxy`
 * otherwise — see `packages/decap-cms/src/backends/local-fs/README.md`.
 */
export function isLocalFsSupported(target: Window = window): boolean {
  return typeof target !== 'undefined' && typeof target.showDirectoryPicker === 'function';
}

export default class LocalFsBackend implements CmsImplementation {
  mediaFolder: string;
  options: { initialWorkflowStatus?: string };
  directoryHandle: FileSystemDirectoryHandle | null = null;

  constructor(config: CmsConfig, options = {}) {
    if (!isLocalFsSupported()) {
      throw new ConfigurationError(
        'The Local FS backend requires the File System Access API '
          + '(window.showDirectoryPicker), which this browser does not support. '
          + 'Use the "proxy" backend, or a browser based on a recent version of Chromium, instead.',
      );
    }
    this.mediaFolder = config.media_folder ?? '';
    this.options = options;
  }

  isGitBackend() {
    return false;
  }

  status() {
    return Promise.resolve({
      auth: { status: this.directoryHandle !== null },
      api: { status: true, statusPage: '' },
    });
  }

  authComponent() {
    return AuthenticationPage;
  }

  /**
   * Re-grant on load: a persisted `FileSystemDirectoryHandle` survives across
   * sessions in IndexedDB, but the browser still requires a fresh permission
   * grant (which in turn requires a user gesture) before it can be read from
   * again. `restoreUser` only reconnects a handle that's already permitted
   * (e.g. still granted from earlier in the same tab); otherwise it rejects
   * so the app falls back to `authComponent`, whose button click supplies the
   * user gesture `requestPermission` needs.
   */
  async restoreUser(): Promise<CmsUser> {
    const handle = await loadDirectoryHandle();
    if (!handle) {
      return Promise.reject(new Error('No local folder has been selected yet.'));
    }

    const granted = await requestPermission(handle, 'readwrite').catch(() => false);
    if (!granted) {
      return Promise.reject(
        new Error('Permission to access the local folder was not (re-)granted.'),
      );
    }

    this.directoryHandle = handle;
    return {} as CmsUser;
  }

  async authenticate(): Promise<CmsUser> {
    const handle = await window.showDirectoryPicker!({ mode: 'readwrite' });
    const granted = await requestPermission(handle, 'readwrite');
    if (!granted) {
      throw new Error('Permission to access the local folder was not granted.');
    }

    this.directoryHandle = handle;
    await saveDirectoryHandle(handle);
    return {} as CmsUser;
  }

  logout() {
    this.directoryHandle = null;
    return clearDirectoryHandle();
  }

  getToken() {
    return Promise.resolve('');
  }

  private get handle(): FileSystemDirectoryHandle {
    if (!this.directoryHandle) {
      throw new Error('Local FS backend is not authenticated: no directory handle is available.');
    }
    return this.directoryHandle;
  }

  async entriesByFolder(
    folder: string,
    extension: string,
    depth: number,
  ): Promise<CmsImplementationEntry[]> {
    const paths = await listFiles(this.handle, folder, extension, depth);
    return Promise.all(paths.map(path => this.getEntry(path)));
  }

  entriesByFiles(files: CmsImplementationFile[]): Promise<CmsImplementationEntry[]> {
    return Promise.all(files.map(file => this.getEntry(file.path)));
  }

  async getEntry(path: string): Promise<CmsImplementationEntry> {
    const data = await readFileAsString(this.handle, path);
    return { file: { path, id: path }, data };
  }

  // Editorial workflow needs a place to hold drafts that isn't just "the
  // working tree the CMS already writes into" (there's no git/PR layer under
  // this backend to stage them against). Out of scope for the initial
  // local-fs backend; `publish_mode: simple` (the default) never calls these.
  unpublishedEntries(): Promise<string[]> {
    return Promise.resolve([]);
  }

  unpublishedEntry(): Promise<never> {
    return Promise.reject(
      new EditorialWorkflowError('content is not under editorial workflow', true),
    );
  }

  unpublishedEntryDataFile(): Promise<never> {
    return Promise.reject(new Error('Editorial workflow is not supported by the Local FS backend.'));
  }

  unpublishedEntryMediaFile(): Promise<never> {
    return Promise.reject(new Error('Editorial workflow is not supported by the Local FS backend.'));
  }

  updateUnpublishedEntryStatus(): Promise<never> {
    return Promise.reject(new Error('Editorial workflow is not supported by the Local FS backend.'));
  }

  publishUnpublishedEntry(): Promise<never> {
    return Promise.reject(new Error('Editorial workflow is not supported by the Local FS backend.'));
  }

  deleteUnpublishedEntry(): Promise<void> {
    return Promise.resolve();
  }

  async persistEntry(entry: CmsFileEntry, _options: CmsPersistOptions): Promise<void> {
    await Promise.all(entry.dataFiles.map(dataFile => writeFile(this.handle, dataFile.path, dataFile.raw)));
    await Promise.all(entry.assets.map(asset => this.writeAsset(asset)));
  }

  private async writeAsset(assetProxy: CmsAssetProxy): Promise<void> {
    if (assetProxy.fileObj) {
      await writeFile(this.handle, assetProxy.path, assetProxy.fileObj);
      return;
    }
    const base64 = await assetProxy.toBase64();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    await writeFile(this.handle, assetProxy.path, bytes);
  }

  async persistMedia(
    assetProxy: CmsAssetProxy,
    _options: CmsPersistOptions,
  ): Promise<CmsImplementationMediaFile> {
    await this.writeAsset(assetProxy);
    return this.getMediaFile(assetProxy.path);
  }

  deleteFiles(paths: string[], _commitMessage: string): Promise<void> {
    return Promise.all(paths.map(path => deleteEntry(this.handle, path))).then(() => undefined);
  }

  async getMedia(mediaFolder = this.mediaFolder): Promise<CmsImplementationMediaFile[]> {
    const paths = await listFiles(this.handle, mediaFolder, '', 1);
    return Promise.all(paths.map(path => this.getMediaFile(path)));
  }

  async getMediaFile(path: string): Promise<CmsImplementationMediaFile> {
    const file = await readFile(this.handle, path);
    const fileObj = blobToFileObj(basename(path), file);
    const url = URL.createObjectURL(fileObj);
    return {
      id: path,
      name: fileObj.name,
      path,
      size: fileObj.size,
      file: fileObj,
      url,
      displayURL: url,
    };
  }

  async getDeployPreview(): Promise<null> {
    return null;
  }
}

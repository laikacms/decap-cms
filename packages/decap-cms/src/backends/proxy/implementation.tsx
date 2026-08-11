import { isError } from 'lodash-es';

import { rawContent } from '@/lib/backend/index';
import { APIError, blobToFileObj, EditorialWorkflowError, unsentRequest } from '@/lib/util/index';
import AuthenticationPage from './AuthenticationPage';

import type { BackendEntry, UnpublishedEntry } from '@/lib/backend/index';
import type {
  CmsAssetProxy,
  CmsConfig,
  CmsDataFile,
  CmsEntry,
  CmsFileEntry,
  CmsImplementation,
  CmsImplementationFile,
  CmsPersistOptions,
  CmsUser,
} from '@/lib/util/index';

function normalizeProxyUrl(proxyUrl: string) {
  const normalizedProxyUrl = proxyUrl.trim();

  if (!normalizedProxyUrl) {
    return null;
  }

  if (normalizedProxyUrl.startsWith('/') && !normalizedProxyUrl.startsWith('//')) {
    return normalizedProxyUrl;
  }

  try {
    const parsed = new URL(normalizedProxyUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return normalizedProxyUrl;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * An entry as the proxy server sends it. The wire format is the CMS's
 * pre-DCMS-1907 entry shape and stays that way: it is a protocol shared with
 * `decap-server`, which this backend does not get to change unilaterally.
 */
type ProxyEntry = {
  file: { path: string, id?: string | null, label?: string, author?: string, updatedOn?: string },
  data: string,
};

function toBackendEntry({ file, data }: ProxyEntry): BackendEntry {
  return {
    file: {
      path: file.path,
      id: file.id,
      ...(file.author ? { author: { name: file.author } } : {}),
      updatedOn: file.updatedOn,
    },
    content: rawContent(data),
  };
}

async function serializeAsset(assetProxy: CmsAssetProxy) {
  const base64content = await assetProxy.toBase64!();
  return { path: assetProxy.path, content: base64content, encoding: 'base64' };
}

type MediaFile = {
  id: string,
  content?: string,
  encoding?: string,
  name: string,
  path: string,
  isDirectory?: boolean,
};

function deserializeMediaFile({ id, content, encoding, path, name, isDirectory }: MediaFile) {
  if (isDirectory) {
    return { id, name, path, displayURL: { id, path }, isDirectory };
  }

  let byteArray = new Uint8Array(0);
  if (encoding !== 'base64') {
    console.error(`Unsupported encoding '${encoding}' for file '${path}'`);
  } else {
    const decodedContent = atob(content!);
    byteArray = new Uint8Array(decodedContent.length);
    for (let i = 0; i < decodedContent.length; i++) {
      byteArray[i] = decodedContent.charCodeAt(i);
    }
  }
  const blob = new Blob([byteArray]);
  const file = blobToFileObj(name, blob);
  const url = URL.createObjectURL(file);
  return { id, name, path, file, size: file.size, url, displayURL: url, isDirectory };
}

export default class ProxyBackend implements CmsImplementation {
  proxyUrl: string;
  mediaFolder: string | undefined;
  options: { initialWorkflowStatus?: string };
  branch: string;
  cmsLabelPrefix: string | undefined;

  constructor(config: CmsConfig, options = {}) {
    if (!config.backend.proxy_url) {
      throw new Error('The Proxy backend needs a "proxy_url" in the backend configuration.');
    }

    const normalizedProxyUrl = normalizeProxyUrl(config.backend.proxy_url);

    if (!normalizedProxyUrl) {
      throw new Error('The Proxy backend requires an http(s) or root-relative "proxy_url".');
    }

    this.branch = config.backend.branch || 'master';
    this.proxyUrl = normalizedProxyUrl;
    this.mediaFolder = config.media_folder ?? '';
    this.options = options;
    this.cmsLabelPrefix = config.backend.cms_label_prefix;
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

  async request(payload: { action: string, params: Record<string, unknown> }) {
    const response = await unsentRequest.fetchWithTimeout(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ branch: this.branch, ...payload }),
    });

    const json = await response.json();

    if (response.ok) {
      return json;
    } else {
      throw new APIError(json.error, response.status, 'Proxy');
    }
  }

  async entriesByFolder(folder: string, extension: string, depth: number) {
    const entries: ProxyEntry[] = await this.request({
      action: 'entriesByFolder',
      params: { branch: this.branch, folder, extension, depth },
    });
    return entries.map(toBackendEntry);
  }

  async entriesByFiles(files: CmsImplementationFile[]) {
    const entries: ProxyEntry[] = await this.request({
      action: 'entriesByFiles',
      params: { branch: this.branch, files },
    });
    return entries.map(toBackendEntry);
  }

  async getEntry(path: string) {
    const entry: ProxyEntry = await this.request({
      action: 'getEntry',
      params: { branch: this.branch, path },
    });
    return toBackendEntry(entry);
  }

  unpublishedEntries() {
    return this.request({
      action: 'unpublishedEntries',
      params: { branch: this.branch },
    });
  }

  async unpublishedEntry({
    id,
    collection,
    slug,
  }: {
    id?: string | undefined,
    collection?: string | undefined,
    slug?: string | undefined,
  }) {
    try {
      const entry: UnpublishedEntry = await this.request({
        action: 'unpublishedEntry',
        params: { branch: this.branch, id, collection, slug, cmsLabelPrefix: this.cmsLabelPrefix },
      });

      return entry;
    } catch (e: unknown) {
      if (isError(e) && 'status' in e && e.status === 404) {
        throw new EditorialWorkflowError('content is not under editorial workflow', true);
      }
      throw e;
    }
  }

  async unpublishedEntryDataFile(collection: string, slug: string, path: string, id: string) {
    const { data } = await this.request({
      action: 'unpublishedEntryDataFile',
      params: { branch: this.branch, collection, slug, path, id },
    });
    return data;
  }

  async unpublishedEntryMediaFile(collection: string, slug: string, path: string, id: string) {
    const file = await this.request({
      action: 'unpublishedEntryMediaFile',
      params: { branch: this.branch, collection, slug, path, id },
    });
    return deserializeMediaFile(file);
  }

  deleteUnpublishedEntry(collection: string, slug: string) {
    return this.request({
      action: 'deleteUnpublishedEntry',
      params: { branch: this.branch, collection, slug },
    });
  }

  async persistEntry(
    entry: CmsDataFile | { dataFiles: CmsDataFile[], assets: CmsAssetProxy[] },
    options: CmsPersistOptions,
  ) {
    if ('dataFiles' in entry && 'assets' in entry) {
      const assets = await Promise.all(entry.assets.map(serializeAsset));
      await this.request({
        action: 'persistEntry',
        params: {
          branch: this.branch,
          dataFiles: entry.dataFiles,
          assets,
          options: { ...options, status: options.status || this.options.initialWorkflowStatus },
          cmsLabelPrefix: this.cmsLabelPrefix,
        },
      });
    }
  }

  updateUnpublishedEntryStatus(collection: string, slug: string, newStatus: string) {
    return this.request({
      action: 'updateUnpublishedEntryStatus',
      params: {
        branch: this.branch,
        collection,
        slug,
        newStatus,
        cmsLabelPrefix: this.cmsLabelPrefix,
      },
    });
  }

  publishUnpublishedEntry(collection: string, slug: string) {
    return this.request({
      action: 'publishUnpublishedEntry',
      params: { branch: this.branch, collection, slug },
    });
  }

  async getMedia(mediaFolder = this.mediaFolder, folderSupport?: boolean) {
    const files: MediaFile[] = await this.request({
      action: 'getMedia',
      params: { branch: this.branch, mediaFolder, folderSupport },
    });

    return files.map(deserializeMediaFile);
  }

  async getMediaFile(path: string) {
    const file = await this.request({
      action: 'getMediaFile',
      params: { branch: this.branch, path },
    });
    return deserializeMediaFile(file);
  }

  async persistMedia(assetProxy: CmsAssetProxy, options: CmsPersistOptions) {
    const asset = await serializeAsset(assetProxy);
    const file: MediaFile = await this.request({
      action: 'persistMedia',
      params: { branch: this.branch, asset, options: { commitMessage: options.commitMessage } },
    });

    return deserializeMediaFile(file);
  }

  deleteFiles(paths: string[], commitMessage: string) {
    return this.request({
      action: 'deleteFiles',
      params: { branch: this.branch, paths, options: { commitMessage } },
    });
  }

  getDeployPreview(collection: string, slug: string) {
    return this.request({
      action: 'getDeployPreview',
      params: { branch: this.branch, collection, slug },
    });
  }
}

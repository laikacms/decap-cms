import minimatchFn from 'minimatch';
import { unsentRequest } from 'decap-cms-lib-util';

import type { ApiRequest, PointerFile } from 'decap-cms-lib-util';

type MakeAuthorizedRequest = (req: ApiRequest) => Promise<Response>;

interface LfsBatchAction {
  href: string;
  header?: { [key: string]: string };
  expires_in?: number;
  expires_at?: string;
}

interface LfsBatchObject {
  oid: string;
  size: number;
}

interface LfsBatchObjectUpload extends LfsBatchObject {
  actions?: {
    upload: LfsBatchAction;
    verify?: LfsBatchAction;
  };
}

interface LfsBatchObjectDownload extends LfsBatchObject {
  actions?: {
    download: LfsBatchAction;
  };
}

interface LfsBatchObjectError extends LfsBatchObject {
  error: {
    code: number;
    message: string;
  };
}

interface LfsBatchUploadResponse {
  transfer?: string;
  objects: (LfsBatchObjectUpload | LfsBatchObjectError)[];
}

interface LfsBatchDownloadResponse {
  transfer?: string;
  objects: (LfsBatchObjectDownload | LfsBatchObjectError)[];
}

// Reuses the same batch API shape as the GitLfsClient in decap-cms-backend-bitbucket
// (Git LFS Batch API spec: https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md),
// extended with a download operation so pointer files can be resolved to their
// real content for display in the GitHub backend.
export class GitLfsClient {
  private static defaultContentHeaders = {
    Accept: 'application/vnd.git-lfs+json',
    ['Content-Type']: 'application/vnd.git-lfs+json',
  };

  constructor(
    public enabled: boolean,
    public rootURL: string,
    public patterns: string[],
    private makeAuthorizedRequest: MakeAuthorizedRequest,
  ) {}

  matchPath(path: string) {
    return this.patterns.some(pattern => minimatchFn(path, pattern, { matchBase: true }));
  }

  async uploadResource(pointer: PointerFile, resource: Blob): Promise<string> {
    const requests = await this.getResourceUploadRequests([pointer]);
    for (const request of requests) {
      await this.doUpload(request.actions!.upload, resource);
      if (request.actions!.verify) {
        await this.doVerify(request.actions!.verify, request);
      }
    }
    return pointer.sha;
  }

  async downloadResource(pointer: PointerFile): Promise<Blob> {
    const [object] = await this.getResourceDownloadRequests([pointer]);
    if (!object?.actions?.download) {
      throw new Error(`Failed to resolve LFS download URL for object '${pointer.sha}'`);
    }
    return this.doDownload(object.actions.download);
  }

  private async doUpload(upload: LfsBatchAction, resource: Blob) {
    await unsentRequest.fetchWithTimeout(decodeURI(upload.href), {
      method: 'PUT',
      body: resource,
      headers: upload.header,
    });
  }

  private async doVerify(verify: LfsBatchAction, object: LfsBatchObject) {
    this.makeAuthorizedRequest({
      url: decodeURI(verify.href),
      method: 'POST',
      headers: { ...GitLfsClient.defaultContentHeaders, ...verify.header },
      body: JSON.stringify({ oid: object.oid, size: object.size }),
    });
  }

  private async doDownload(download: LfsBatchAction): Promise<Blob> {
    const response = await unsentRequest.fetchWithTimeout(decodeURI(download.href), {
      method: 'GET',
      headers: download.header,
    });
    return response.blob();
  }

  private async getResourceUploadRequests(objects: PointerFile[]): Promise<LfsBatchObjectUpload[]> {
    const response = await this.makeAuthorizedRequest({
      url: `${this.rootURL}/objects/batch`,
      method: 'POST',
      headers: GitLfsClient.defaultContentHeaders,
      body: JSON.stringify({
        operation: 'upload',
        transfers: ['basic'],
        objects: objects.map(({ sha, ...rest }) => ({ ...rest, oid: sha })),
      }),
    });
    return ((await response.json()) as LfsBatchUploadResponse).objects.filter(object => {
      if ('error' in object) {
        console.error(object.error);
        return false;
      }
      return object.actions;
    });
  }

  private async getResourceDownloadRequests(
    objects: PointerFile[],
  ): Promise<LfsBatchObjectDownload[]> {
    const response = await this.makeAuthorizedRequest({
      url: `${this.rootURL}/objects/batch`,
      method: 'POST',
      headers: GitLfsClient.defaultContentHeaders,
      body: JSON.stringify({
        operation: 'download',
        transfers: ['basic'],
        objects: objects.map(({ sha, ...rest }) => ({ ...rest, oid: sha })),
      }),
    });
    return ((await response.json()) as LfsBatchDownloadResponse).objects.filter(object => {
      if ('error' in object) {
        console.error(object.error);
        return false;
      }
      return object.actions;
    });
  }
}

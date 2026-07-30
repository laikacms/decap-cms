import { minimatch } from 'minimatch';
import { unsentRequest } from 'decap-cms-lib-util';

import type { ApiRequest, PointerFile } from 'decap-cms-lib-util';

// Standard Git LFS batch API client (https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md),
// targeting GitHub's LFS batch endpoint at `https://github.com/<owner>/<repo>.git/info/lfs/objects/batch`.
// Auth is injected by the caller via `makeAuthorizedRequest`, which reuses the GitHub backend's own
// token-based request signing rather than introducing a second auth mechanism.

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

interface LfsBatchResponse<T> {
  transfer?: string;
  objects: (T | LfsBatchObjectError)[];
}

function isBatchError<T extends LfsBatchObject>(
  object: T | LfsBatchObjectError,
): object is LfsBatchObjectError {
  return 'error' in object;
}

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
    return this.patterns.some(pattern => minimatch(path, pattern, { matchBase: true }));
  }

  async uploadResource(pointer: PointerFile, resource: Blob): Promise<string> {
    const objects = await this.batch<LfsBatchObjectUpload>('upload', [pointer]);
    for (const object of objects) {
      if (!object.actions?.upload) {
        continue;
      }
      await this.doUpload(object.actions.upload, resource);
      if (object.actions.verify) {
        await this.doVerify(object.actions.verify, object);
      }
    }
    return pointer.sha;
  }

  async getDownloadURL(pointer: PointerFile): Promise<Blob> {
    const [object] = await this.batch<LfsBatchObjectDownload>('download', [pointer]);
    if (!object?.actions?.download) {
      throw new Error(`Unable to resolve LFS download action for object '${pointer.sha}'`);
    }
    return this.doDownload(object.actions.download);
  }

  private async doDownload(download: LfsBatchAction): Promise<Blob> {
    const response = await unsentRequest.fetchWithTimeout(decodeURI(download.href), {
      method: 'GET',
      headers: download.header,
    });
    if (!response.ok) {
      throw new Error(`Failed to download LFS object: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }

  private async doUpload(upload: LfsBatchAction, resource: Blob) {
    await unsentRequest.fetchWithTimeout(decodeURI(upload.href), {
      method: 'PUT',
      body: resource,
      headers: upload.header,
    });
  }

  private async doVerify(verify: LfsBatchAction, object: LfsBatchObject) {
    await this.makeAuthorizedRequest({
      url: decodeURI(verify.href),
      method: 'POST',
      headers: { ...GitLfsClient.defaultContentHeaders, ...verify.header },
      body: JSON.stringify({ oid: object.oid, size: object.size }),
    });
  }

  private async batch<T extends LfsBatchObject & { actions?: unknown }>(
    operation: 'upload' | 'download',
    objects: PointerFile[],
  ): Promise<T[]> {
    const response = await this.makeAuthorizedRequest({
      url: `${this.rootURL}/objects/batch`,
      method: 'POST',
      headers: GitLfsClient.defaultContentHeaders,
      body: JSON.stringify({
        operation,
        transfers: ['basic'],
        objects: objects.map(({ sha, ...rest }) => ({ ...rest, oid: sha })),
      }),
    });
    const body = (await response.json()) as LfsBatchResponse<T>;
    return body.objects.filter((object): object is T => {
      if (isBatchError(object)) {
        console.error(object.error);
        return false;
      }
      return Boolean(object.actions);
    });
  }
}

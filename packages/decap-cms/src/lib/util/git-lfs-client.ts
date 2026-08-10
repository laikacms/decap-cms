import { minimatch } from 'minimatch';

import unsentRequest from './unsentRequest';

import type { ApiRequest } from './API';
import type { PointerFile } from './git-lfs';

/**
 * A client for the standard Git LFS batch API
 * (https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md).
 *
 * Deliberately host-agnostic: the caller supplies the batch endpoint
 * (`rootURL`), the `.gitattributes` patterns that decide which paths are LFS
 * tracked, and a `makeAuthorizedRequest` that signs requests with whatever
 * credentials that backend already holds. Bitbucket and GitHub both point it
 * at their own endpoints rather than each shipping a near-identical copy.
 *
 * Not re-exported from `@/lib/util/index`: importing this module pulls in
 * `minimatch`, and only the backends that actually support LFS should pay for
 * it. Import the module path directly.
 */

type MakeAuthorizedRequest = (req: ApiRequest) => Promise<Response>;

interface LfsBatchAction {
  href: string;
  header?: { [key: string]: string } | undefined;
  expires_in?: number;
  expires_at?: string;
}

interface LfsBatchObject {
  oid: string;
  size: number;
}

export interface LfsBatchObjectUpload extends LfsBatchObject {
  actions?: {
    upload: LfsBatchAction,
    verify?: LfsBatchAction,
  };
}

export interface LfsBatchObjectDownload extends LfsBatchObject {
  actions?: {
    download: LfsBatchAction,
  };
}

interface LfsBatchObjectError extends LfsBatchObject {
  error: {
    code: number,
    message: string,
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

  /**
   * Fetch the real bytes behind a pointer file. Needed by backends whose
   * contents API hands back the raw pointer text rather than resolving it
   * server-side.
   */
  async downloadResource(pointer: PointerFile): Promise<Blob> {
    const [object] = await this.batch<LfsBatchObjectDownload>('download', [pointer]);
    if (!object?.actions?.download) {
      throw new Error(`Unable to resolve LFS download action for object '${pointer.sha}'`);
    }
    return this.doDownload(object.actions.download);
  }

  private async doDownload(download: LfsBatchAction): Promise<Blob> {
    const response = await unsentRequest.fetchWithTimeout(decodeURI(download.href), {
      method: 'GET',
      ...(download.header === undefined ? {} : { headers: download.header }),
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
      ...(upload.header === undefined ? {} : { headers: upload.header }),
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

import type { CmsAssetProxy } from '@/lib/util/index';

type AssetProxyType = CmsAssetProxy;

interface AssetProxyArgs {
  path: string;
  url?: string | undefined;
  file?: File | undefined;
  field?: unknown;
}

export default class AssetProxy implements AssetProxyType {
  url?: string | undefined;
  fileObj?: File | undefined;
  path: string;
  field?: unknown;

  // The proxy's url and file are fixed at construction, so the fetched blob and
  // its base64 rendering can be memoized. Promises (not values) are cached so
  // concurrent callers share one fetch/read instead of racing duplicates.
  private blobPromise?: Promise<Blob>;
  private base64Promise?: Promise<string>;

  constructor({ url, file, path, field }: AssetProxyArgs) {
    this.url = url ? url : file ? window.URL.createObjectURL(file) : '';
    this.fileObj = file;
    this.path = path;
    this.field = field;

    if (file) {
      this.blobPromise = Promise.resolve(file);
    }
  }

  toString(): string {
    return this.url ?? '';
  }

  private async fetchBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
  }

  private readBase64(blob: Blob): Promise<string> {
    return new Promise<string>(resolve => {
      const fr = new FileReader();
      fr.onload = (readerEvt): void => {
        const dataUrl = readerEvt.target?.result || '';

        resolve(dataUrl.toString().split('base64,')[1] ?? '');
      };
      fr.readAsDataURL(blob);
    });
  }

  private async loadBase64(url: string): Promise<string> {
    this.blobPromise ??= this.fetchBlob(url);
    const blob = await this.blobPromise;
    if (blob.size <= 0) {
      return '';
    }
    return this.readBase64(blob);
  }

  async toBase64(): Promise<string> {
    if (!this.url) {
      return '';
    }
    this.base64Promise ??= this.loadBase64(this.url);

    return this.base64Promise;
  }
}

export function createAssetProxy({ url, file, path, field }: AssetProxyArgs): AssetProxy {
  return new AssetProxy({ url, file, path, field });
}

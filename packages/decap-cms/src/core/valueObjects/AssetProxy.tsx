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

  constructor({ url, file, path, field }: AssetProxyArgs) {
    this.url = url ? url : file ? window.URL.createObjectURL(file) : '';
    this.fileObj = file;
    this.path = path;
    this.field = field;
  }

  toString(): string {
    return this.url ?? '';
  }

  async toBase64(): Promise<string> {
    if (!this.url) {
      return '';
    }
    const blob = await fetch(this.url).then(response => response.blob());
    if (blob.size <= 0) {
      return '';
    }
    const result = await new Promise<string>(resolve => {
      const fr = new FileReader();
      fr.onload = (readerEvt): void => {
        const binaryString = readerEvt.target?.result || '';

        resolve(binaryString.toString().split('base64,')[1]);
      };
      fr.readAsDataURL(blob);
    });

    return result;
  }
}

export function createAssetProxy({ url, file, path, field }: AssetProxyArgs): AssetProxy {
  return new AssetProxy({ url, file, path, field });
}

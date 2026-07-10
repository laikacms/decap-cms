import pickBy from 'lodash/pickBy';
import trimEnd from 'lodash/trimEnd';

import { unsentRequest } from '../../../../lib/util/index';
import { addParams } from '../../../lib/urlHelper';

const { fetchWithTimeout: fetch } = unsentRequest;

export interface AssetStoreConfig {
  getSignedFormURL?: string;
  shouldConfirmUpload?: boolean;
  [key: string]: unknown;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
  params?: Record<string, string | number>;
}

interface AssetResponse {
  id: string;
  name: string;
  size: number;
  url: string;
}

interface SignedFormResponse {
  form: {
    url: string;
    fields: Record<string, string>;
  };
  asset: AssetResponse;
}

interface AssetFile {
  id: string;
  name: string;
  size: number;
  displayURL: string;
  url: string;
  path: string;
}

interface UploadResult {
  success: boolean;
  asset: AssetFile;
}

interface FileData {
  name: string;
  size: number;
  content_type?: string;
  visibility?: string;
}

type GetTokenFn = () => Promise<string>;

export default class AssetStore {
  config: AssetStoreConfig;
  getToken: GetTokenFn;
  shouldConfirmUpload: boolean;
  getSignedFormURL: string;

  constructor(config: AssetStoreConfig, getToken: GetTokenFn) {
    this.config = config;
    if (config.getSignedFormURL == null) {
      throw 'The AssetStore integration needs the getSignedFormURL in the integration configuration.';
    }
    this.getToken = getToken;

    this.shouldConfirmUpload = config.shouldConfirmUpload ?? false;
    this.getSignedFormURL = trimEnd(config.getSignedFormURL as string, '/');
  }

  parseJsonResponse(response: Response): Promise<unknown> {
    return response.json().then(json => {
      if (!response.ok) {
        return Promise.reject(json);
      }

      return json;
    });
  }

  urlFor(path: string, options: RequestOptions): string {
    const params: string[] = [];
    if (options.params) {
      for (const key in options.params) {
        params.push(`${key}=${encodeURIComponent(options.params[key])}`);
      }
    }
    if (params.length) {
      path += `?${params.join('&')}`;
    }
    return path;
  }

  requestHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
    };
  }

  confirmRequest(assetID: string): void {
    this.getToken().then(token =>
      this.request(`${this.getSignedFormURL}/${assetID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ state: 'uploaded' }),
      }),
    );
  }

  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const headers = this.requestHeaders(options.headers || {});
    const url = this.urlFor(path, options);
    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get('Content-Type');
    const isJson = contentType && contentType.match(/json/);
    const content = isJson ? await this.parseJsonResponse(response) : response.text();
    return content;
  }

  async retrieve(
    query: string | undefined,
    page: number | undefined,
    privateUpload: boolean,
  ): Promise<AssetFile[]> {
    const params = pickBy(
      { search: query, page, filter: privateUpload ? 'private' : 'public' },
      val => !!val,
    );
    const url = addParams(this.getSignedFormURL, params as Record<string, string>);
    const token = await this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const response = (await this.request(url, { headers })) as AssetResponse[];
    const files = response.map(({ id, name, size, url }) => {
      return { id, name, size, displayURL: url, url, path: url };
    });
    return files;
  }

  delete(assetID: string): Promise<unknown> {
    const url = `${this.getSignedFormURL}/${assetID}`;
    return this.getToken().then(token =>
      this.request(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }

  async upload(file: File, privateUpload = false): Promise<UploadResult> {
    const fileData: FileData = {
      name: file.name,
      size: file.size,
    };
    if (file.type) {
      fileData.content_type = file.type;
    }

    if (privateUpload) {
      fileData.visibility = 'private';
    }

    try {
      const token = await this.getToken();
      const response = (await this.request(this.getSignedFormURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fileData),
      })) as SignedFormResponse;
      const formURL = response.form.url;
      const formFields = response.form.fields;
      const { id, name, size, url } = response.asset;

      const formData = new FormData();
      Object.keys(formFields).forEach(key => formData.append(key, formFields[key]));
      formData.append('file', file, file.name);

      await this.request(formURL, { method: 'POST', body: formData });

      if (this.shouldConfirmUpload) {
        await this.confirmRequest(id);
      }

      const asset = { id, name, size, displayURL: url, url, path: url };
      return { success: true, asset };
    } catch (error: unknown) {
      console.error(error);
      throw error;
    }
  }
}

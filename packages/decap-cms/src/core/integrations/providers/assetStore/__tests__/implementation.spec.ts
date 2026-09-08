import { afterEach, describe, expect, it, vi } from 'vitest';

import AssetStore from '@/core/integrations/providers/assetStore/implementation';

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function textResponse(body: string, ok = true) {
  return {
    ok,
    headers: { get: () => 'text/plain' },
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  responses.forEach(response => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(response));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const getToken = () => Promise.resolve('token123');

describe('AssetStore constructor', () => {
  it('throws when getSignedFormURL is missing', () => {
    expect(() => new AssetStore({}, getToken)).toThrow(
      'The AssetStore integration needs the getSignedFormURL in the integration configuration.',
    );
  });

  it('trims a trailing slash off getSignedFormURL when present', () => {
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets/' },
      getToken,
    );

    expect(assetStore.getSignedFormURL).toBe('https://example.com/assets');
  });

  it('leaves getSignedFormURL untouched when there is no trailing slash', () => {
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );

    expect(assetStore.getSignedFormURL).toBe('https://example.com/assets');
  });
});

describe('AssetStore#urlFor', () => {
  const assetStore = new AssetStore({ getSignedFormURL: 'https://example.com/assets' }, getToken);

  it('appends a query string when params are given', () => {
    const url = assetStore.urlFor('/assets', { params: { search: 'cats', page: 2 } });

    expect(url).toBe('/assets?search=cats&page=2');
  });

  it('URL-encodes param values', () => {
    const url = assetStore.urlFor('/assets', { params: { search: 'cats & dogs' } });

    expect(url).toBe('/assets?search=cats%20%26%20dogs');
  });

  it('adds no "?" when params is an empty object', () => {
    const url = assetStore.urlFor('/assets', { params: {} });

    expect(url).toBe('/assets');
  });

  it('adds no "?" when params is omitted', () => {
    const url = assetStore.urlFor('/assets', {});

    expect(url).toBe('/assets');
  });
});

describe('AssetStore#parseJsonResponse', () => {
  const assetStore = new AssetStore({ getSignedFormURL: 'https://example.com/assets' }, getToken);

  it('resolves with the parsed body when response.ok is true', async () => {
    const body = { hello: 'world' };

    await expect(assetStore.parseJsonResponse(jsonResponse(body))).resolves.toEqual(body);
  });

  it('rejects with the parsed body when response.ok is false', async () => {
    const body = { error: 'nope' };

    await expect(assetStore.parseJsonResponse(jsonResponse(body, false))).rejects.toEqual(body);
  });
});

describe('AssetStore#retrieve', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('drops falsy search/page params and maps the response into AssetFile[]', async () => {
    const fetchMock = stubFetch(
      jsonResponse([
        { id: '1', name: 'cat.png', size: 100, url: 'https://cdn.example.com/cat.png' },
      ]),
    );
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );

    const files = await assetStore.retrieve(undefined, undefined, false);

    expect(files).toEqual([
      {
        id: '1',
        name: 'cat.png',
        size: 100,
        displayURL: 'https://cdn.example.com/cat.png',
        url: 'https://cdn.example.com/cat.png',
        path: 'https://cdn.example.com/cat.png',
      },
    ]);
    // `filter` is always `'private'`/`'public'` (never falsy), so only
    // `search`/`page` get dropped by `pickBy`.
    const requestedURL = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedURL.searchParams.has('search')).toBe(false);
    expect(requestedURL.searchParams.has('page')).toBe(false);
    expect(requestedURL.searchParams.get('filter')).toBe('public');
  });

  it('includes truthy search/page/filter params in the request URL', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );

    await assetStore.retrieve('cats', 2, true);

    const requestedURL = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedURL.searchParams.get('search')).toBe('cats');
    expect(requestedURL.searchParams.get('page')).toBe('2');
    expect(requestedURL.searchParams.get('filter')).toBe('private');
  });

  it('uses "public" as the filter when privateUpload is falsy but search is set', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );

    await assetStore.retrieve('cats', undefined, false);

    const requestedURL = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedURL.searchParams.get('filter')).toBe('public');
    expect(requestedURL.searchParams.has('page')).toBe(false);
  });
});

describe('AssetStore#upload', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function signedFormBody() {
    return {
      form: { url: 'https://example.com/upload', fields: { key: 'value', policy: 'abc' } },
      asset: { id: '42', name: 'cat.png', size: 100, url: 'https://cdn.example.com/cat.png' },
    };
  }

  it('performs a two-step POST: signed-form request then FormData upload', async () => {
    const fetchMock = stubFetch(jsonResponse(signedFormBody()), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );
    const file = new File(['content'], 'cat.png', { type: 'image/png' });

    const result = await assetStore.upload(file);

    expect(result).toEqual({
      success: true,
      asset: {
        id: '42',
        name: 'cat.png',
        size: 100,
        displayURL: 'https://cdn.example.com/cat.png',
        url: 'https://cdn.example.com/cat.png',
        path: 'https://cdn.example.com/cat.png',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstURL, firstOptions] = fetchMock.mock.calls[0];
    expect(firstURL).toBe('https://example.com/assets');
    expect(firstOptions).toMatchObject({ method: 'POST' });
    const firstBody = JSON.parse(firstOptions.body as string);
    expect(firstBody).toEqual({ name: 'cat.png', size: 7, content_type: 'image/png' });

    const [secondURL, secondOptions] = fetchMock.mock.calls[1];
    expect(secondURL).toBe('https://example.com/upload');
    expect(secondOptions).toMatchObject({ method: 'POST' });
    expect(secondOptions.body).toBeInstanceOf(FormData);
    const formData = secondOptions.body as FormData;
    expect(formData.get('key')).toBe('value');
    expect(formData.get('policy')).toBe('abc');
    expect(formData.get('file')).toBeInstanceOf(File);
  });

  it('sets content_type only when the file has a type', async () => {
    stubFetch(jsonResponse(signedFormBody()), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );
    const file = new File(['content'], 'noext', { type: '' });

    await assetStore.upload(file);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstBody).not.toHaveProperty('content_type');
  });

  it('sets visibility to "private" only when privateUpload is true', async () => {
    stubFetch(jsonResponse(signedFormBody()), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );
    const file = new File(['content'], 'cat.png', { type: 'image/png' });

    await assetStore.upload(file, true);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstBody).toMatchObject({ visibility: 'private' });
  });

  it('does not set visibility when privateUpload is false', async () => {
    stubFetch(jsonResponse(signedFormBody()), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets' },
      getToken,
    );
    const file = new File(['content'], 'cat.png', { type: 'image/png' });

    await assetStore.upload(file, false);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstBody).not.toHaveProperty('visibility');
  });

  it('does not call confirmRequest when shouldConfirmUpload is false', async () => {
    stubFetch(jsonResponse(signedFormBody()), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets', shouldConfirmUpload: false },
      getToken,
    );
    const confirmRequestSpy = vi.spyOn(assetStore, 'confirmRequest');
    const file = new File(['content'], 'cat.png', { type: 'image/png' });

    await assetStore.upload(file);

    expect(confirmRequestSpy).not.toHaveBeenCalled();
  });

  it('calls confirmRequest with the asset id when shouldConfirmUpload is true', async () => {
    stubFetch(jsonResponse(signedFormBody()), textResponse(''), textResponse(''));
    const assetStore = new AssetStore(
      { getSignedFormURL: 'https://example.com/assets', shouldConfirmUpload: true },
      getToken,
    );
    const confirmRequestSpy = vi.spyOn(assetStore, 'confirmRequest');
    const file = new File(['content'], 'cat.png', { type: 'image/png' });

    await assetStore.upload(file);

    expect(confirmRequestSpy).toHaveBeenCalledWith('42');
  });
});

import { describe, expect, test, vi } from 'vitest';

import ProxyBackend from '@/backends/proxy/implementation';

import type { CmsConfig } from '@/lib/util/index';

function makeConfig(proxy_url: unknown, overrides: Record<string, unknown> = {}): CmsConfig {
  return {
    backend: {
      name: 'proxy',
      proxy_url,
      ...overrides,
    },
  } as unknown as CmsConfig;
}

describe('proxy backend implementation proxy_url validation', () => {
  test('accepts an http proxy_url', () => {
    const backend = new ProxyBackend(makeConfig('http://localhost:8081/api/v1'));

    expect(backend.proxyUrl).toBe('http://localhost:8081/api/v1');
  });

  test('accepts an https proxy_url', () => {
    const backend = new ProxyBackend(makeConfig('https://proxy.example.com/api/v1'));

    expect(backend.proxyUrl).toBe('https://proxy.example.com/api/v1');
  });

  test('accepts a root-relative proxy_url', () => {
    const backend = new ProxyBackend(makeConfig('/api/v1'));

    expect(backend.proxyUrl).toBe('/api/v1');
  });

  test('trims whitespace from proxy_url', () => {
    const backend = new ProxyBackend(makeConfig('  http://localhost:8081/api/v1  '));

    expect(backend.proxyUrl).toBe('http://localhost:8081/api/v1');
  });

  test('throws when proxy_url is missing', () => {
    expect(() => new ProxyBackend(makeConfig(undefined))).toThrow(
      'The Proxy backend needs a "proxy_url" in the backend configuration.',
    );
  });

  test('throws when proxy_url uses the javascript: scheme', () => {
    expect(() => new ProxyBackend(makeConfig('javascript:alert(1)'))).toThrow(
      'The Proxy backend requires an http(s) or root-relative "proxy_url".',
    );
  });

  test('throws when proxy_url is protocol-relative', () => {
    expect(() => new ProxyBackend(makeConfig('//evil.example.com/api/v1'))).toThrow(
      'The Proxy backend requires an http(s) or root-relative "proxy_url".',
    );
  });

  test('throws when proxy_url is not a valid URL', () => {
    expect(() => new ProxyBackend(makeConfig('not a url'))).toThrow(
      'The Proxy backend requires an http(s) or root-relative "proxy_url".',
    );
  });
});

/**
 * The proxy server speaks the legacy `{ file, data }` wire shape; the backend
 * is the adapter that turns it into `BackendEntry`. Stubbing `request` keeps
 * these tests on that translation rather than on HTTP.
 */
function backendWithResponse(response: unknown) {
  const backend = new ProxyBackend(makeConfig('http://localhost:8081/api/v1'));
  const request = vi.fn(() => Promise.resolve(response));
  backend.request = request as never;
  return { backend, request };
}

describe('proxy backend entry reads', () => {
  test('returns folder entries as raw content with a structured author', async () => {
    const { backend, request } = backendWithResponse([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: 'Ada Lovelace',
          updatedOn: '2026-01-02T03:04:05Z',
        },
        data: '# A',
      },
    ]);

    await expect(backend.entriesByFolder('posts', 'md', 1)).resolves.toEqual([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: { name: 'Ada Lovelace' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: '# A' },
      },
    ]);

    expect(request).toHaveBeenCalledWith({
      action: 'entriesByFolder',
      params: { branch: 'master', folder: 'posts', extension: 'md', depth: 1 },
    });
  });

  test('omits the author when the proxy server reports none', async () => {
    const { backend } = backendWithResponse([
      { file: { path: 'posts/a.md', id: 'sha-a' }, data: '# A' },
    ]);

    const [entry] = await backend.entriesByFolder('posts', 'md', 1);

    expect(entry.file).not.toHaveProperty('author');
  });

  test('treats an empty author string as "the proxy server did not say"', async () => {
    const { backend } = backendWithResponse([
      { file: { path: 'posts/a.md', id: 'sha-a', author: '' }, data: '# A' },
    ]);

    const [entry] = await backend.entriesByFolder('posts', 'md', 1);

    expect(entry.file).not.toHaveProperty('author');
  });

  test('does not echo the display label back: it is collection config', async () => {
    const { backend } = backendWithResponse([
      { file: { path: 'posts/a.md', id: 'sha-a', label: 'A' }, data: '# A' },
    ]);

    const [entry] = await backend.entriesByFolder('posts', 'md', 1);

    expect(entry.file).not.toHaveProperty('label');
  });

  test('returns named files as raw content', async () => {
    const files = [{ path: 'pages/about.md' }];
    const { backend, request } = backendWithResponse([
      { file: { path: 'pages/about.md', id: null }, data: '# About' },
    ]);

    await expect(backend.entriesByFiles(files)).resolves.toEqual([
      { file: { path: 'pages/about.md', id: null, updatedOn: undefined }, content: { kind: 'raw', raw: '# About' } },
    ]);

    expect(request).toHaveBeenCalledWith({
      action: 'entriesByFiles',
      params: { branch: 'master', files },
    });
  });

  test('returns a single entry as raw content', async () => {
    const { backend, request } = backendWithResponse({
      file: { path: 'posts/a.md', id: 'sha-a' },
      data: '# A',
    });

    await expect(backend.getEntry('posts/a.md')).resolves.toEqual({
      file: { path: 'posts/a.md', id: 'sha-a', updatedOn: undefined },
      content: { kind: 'raw', raw: '# A' },
    });

    expect(request).toHaveBeenCalledWith({
      action: 'getEntry',
      params: { branch: 'master', path: 'posts/a.md' },
    });
  });
});

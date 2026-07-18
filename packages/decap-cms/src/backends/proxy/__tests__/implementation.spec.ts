import { describe, expect, test } from 'vitest';

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

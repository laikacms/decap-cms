import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';

import {
  applyBackendPermissionFilter,
  applyBackendPreloadConfig,
  configLoaded,
  handleLocalBackend,
  loadConfig,
  refilterConfigForPermissions,
} from '@/core/actions/config';
import { registerBackend, registerEntryCodec } from '@/core/lib/registry';
import { yamlEntryCodec } from '@/entry-codecs/yaml/index';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.mock('../../backend', () => ({
  resolveBackend: vi.fn(() => ({ isGitBackend: vi.fn(() => true) })),
}));
vi.mock('../../lib/validateConfig');

registerEntryCodec(yamlEntryCodec);

// Backend hooks for Decap Turbo (upstream 9cd8963bf, 60b963ba0, f8f151b25,
// 479d9b0a7, bd173a229, 915b0bec8): a static `preloadConfig` and per-user
// collection permissions.
const preloadConfig = vi.fn();
class PreloadingBackend {
  static preloadConfig = preloadConfig;
}
registerBackend('preload-hook-test', PreloadingBackend as never);
class PlainBackend {}
registerBackend('preload-hook-plain', PlainBackend as never);

describe('backend config hooks', () => {
  const originalLocation = window.location;

  afterEach(() => {
    preloadConfig.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  describe('applyBackendPreloadConfig', () => {
    it('returns the original config when the backend has no preloadConfig', async () => {
      const config = { backend: { name: 'preload-hook-plain' } } as any;
      await expect(applyBackendPreloadConfig(config)).resolves.toBe(config);
    });

    it('returns the original config when the backend is not registered', async () => {
      const config = { backend: { name: 'not-registered' } } as any;
      await expect(applyBackendPreloadConfig(config)).resolves.toBe(config);
    });

    it('awaits and returns the backend-supplied config', async () => {
      const resolved = { backend: { name: 'preload-hook-test', repo: 'owner/repo' } };
      preloadConfig.mockResolvedValue(resolved);
      const config = { backend: { name: 'preload-hook-test', turbo_site_id: 'site-123' } } as any;

      await expect(applyBackendPreloadConfig(config)).resolves.toBe(resolved);
      expect(preloadConfig).toHaveBeenCalledWith(config);
    });
  });

  describe('handleLocalBackend with a preloading backend', () => {
    it('still routes to a detected local proxy', async () => {
      Object.defineProperty(window, 'location', { configurable: true, value: { hostname: 'localhost' } });
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          repo: 'test-repo',
          publish_modes: ['simple', 'editorial_workflow'],
          type: 'local_git',
        }),
      }) as unknown as typeof fetch;

      const config = { local_backend: true, backend: { name: 'preload-hook-test' } } as any;
      const actual = await handleLocalBackend(config);

      expect(actual).toEqual({
        local_backend: true,
        backend: { name: 'proxy', proxy_url: 'http://localhost:8081/api/v1' },
      });
      // Proxy detection renamed the backend, so its preload has nothing to do.
      await expect(applyBackendPreloadConfig(actual)).resolves.toBe(actual);
      expect(preloadConfig).not.toHaveBeenCalled();
    });

    it('keeps the backend when no proxy is detected', async () => {
      Object.defineProperty(window, 'location', { configurable: true, value: { hostname: 'localhost' } });
      global.fetch = vi.fn().mockRejectedValue(new Error()) as unknown as typeof fetch;

      const config = { local_backend: true, backend: { name: 'preload-hook-test' } } as any;
      await expect(handleLocalBackend(config)).resolves.toEqual(config);
    });
  });

  describe('loadConfig', () => {
    beforeEach(() => {
      document.querySelector = vi.fn();
    });

    it('applies the backend preload before normalizing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: () => Promise.resolve(stringify({ backend: { name: 'preload-hook-test', turbo_site_id: 's' } })),
        headers: new Headers(),
      }) as unknown as typeof fetch;
      preloadConfig.mockImplementation(async config => ({
        ...config,
        backend: { ...config.backend, repo: 'owner/from-turbo' },
      }));
      const dispatch = vi.fn();

      await loadConfig()(dispatch);

      const success = dispatch.mock.calls.map(call => call[0]).find(action => action.type === 'CONFIG_SUCCESS');
      expect(success.payload.backend).toEqual({
        name: 'preload-hook-test',
        turbo_site_id: 's',
        repo: 'owner/from-turbo',
      });
    });

    it('fails the load when the preload throws', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        text: () => Promise.resolve(stringify({ backend: { name: 'preload-hook-test' } })),
        headers: new Headers(),
      }) as unknown as typeof fetch;
      preloadConfig.mockRejectedValue(new Error('no site'));
      const dispatch = vi.fn();

      await expect(loadConfig()(dispatch)).rejects.toThrow('no site');
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONFIG_FAILURE' }));
    });
  });

  describe('applyBackendPermissionFilter', () => {
    const config = {
      collections: [{ name: 'posts' }, { name: 'pages' }, { name: 'settings' }],
    } as any;

    it('returns the original config when permissions are absent', () => {
      expect(applyBackendPermissionFilter(config)).toBe(config);
    });

    it('returns the original config when permissions.collections is empty', () => {
      expect(applyBackendPermissionFilter(config, { collections: {} })).toBe(config);
    });

    it('drops collections resolved to access "none"', () => {
      const actual = applyBackendPermissionFilter(config, {
        collections: { pages: 'none', settings: 'view' },
      });

      expect(actual.collections.map(c => c.name)).toEqual(['posts', 'settings']);
    });

    it('keeps a collection absent from the permission map at full access', () => {
      const actual = applyBackendPermissionFilter(config, { collections: { pages: 'none' } });

      expect(actual.collections.map(c => c.name)).toEqual(['posts', 'settings']);
      expect(actual.collections[0]).toBe(config.collections[0]);
    });

    it('returns the original config reference when every listed collection is editable', () => {
      const actual = applyBackendPermissionFilter(config, {
        collections: { posts: 'edit', pages: 'edit' },
      });

      expect(actual).toBe(config);
    });

    it('strips create, delete and publish from view-only collections', () => {
      const actual = applyBackendPermissionFilter(
        { collections: [{ name: 'posts', create: true, delete: true, publish: true }] } as any,
        { collections: { posts: 'view' } },
      );

      expect(actual.collections[0]).toEqual({
        name: 'posts',
        create: false,
        delete: false,
        publish: false,
      });
    });
  });

  describe('refilterConfigForPermissions', () => {
    it('re-filters the config already in state and dispatches it narrowed', () => {
      const config = { collections: [{ name: 'posts' }, { name: 'pages' }] };
      const getState = vi.fn().mockReturnValue({ config });
      const dispatch = vi.fn();

      refilterConfigForPermissions({ collections: { pages: 'none' } })(dispatch, getState);

      expect(dispatch).toHaveBeenCalledWith(configLoaded({ collections: [{ name: 'posts' }] } as any));
    });

    it('dispatches nothing when the permissions change nothing', () => {
      const config = { collections: [{ name: 'posts' }] };
      const dispatch = vi.fn();

      refilterConfigForPermissions({ collections: { posts: 'edit' } })(dispatch, () => ({ config }));

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});

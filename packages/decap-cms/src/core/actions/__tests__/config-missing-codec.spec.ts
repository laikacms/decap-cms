import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig, parseConfig } from '@/core/actions/config';

import type { CmsConfig } from '@/lib/util/index';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.mock('../../backend', () => {
  return {
    resolveBackend: vi.fn(() => ({ isGitBackend: vi.fn(() => true) })),
  };
});
vi.mock('../../lib/validateConfig');

// Runs in its own module registry (vitest isolates test files), so no entry
// codecs are registered here: the TypeScript-driven `/bare` scenario where
// core bundles no YAML parser and config comes from `CMS.init({ config })`.
describe('config without a registered yaml entry codec', () => {
  beforeEach(() => {
    document.querySelector = vi.fn();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  it('parseConfig fails loudly', () => {
    expect(() => parseConfig('backend:\n  name: test-repo\n')).toThrow(/registerEntryCodec/);
  });

  it('loadConfig skips config.yml when a manual config is provided', async () => {
    const dispatch = vi.fn();

    await loadConfig({ backend: { name: 'github' } } as Partial<CmsConfig>)(dispatch);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: 'CONFIG_REQUEST' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CONFIG_SUCCESS',
        payload: expect.objectContaining({ backend: { name: 'github' } }),
      }),
    );
  });

  it('loadConfig fails loudly when only config.yml could provide a config', async () => {
    const dispatch = vi.fn();

    await expect(loadConfig()(dispatch)).rejects.toThrow(/registerEntryCodec/);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONFIG_FAILURE' }));
  });
});

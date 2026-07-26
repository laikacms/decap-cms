import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '@/core/actions/config';
import { registerEntryCodec } from '@/core/lib/registry';
import { jsonEntryCodec } from '@/entry-codecs/json/index';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.mock('../../backend', () => {
  return {
    resolveBackend: vi.fn(() => ({ isGitBackend: vi.fn(() => true) })),
  };
});
vi.mock('../../lib/validateConfig');

registerEntryCodec(jsonEntryCodec);

describe('config with a selectively registered entry codec', () => {
  beforeEach(() => {
    document.querySelector = vi.fn().mockReturnValue({
      type: 'text/yaml',
      href: 'https://example.com/cms-config',
    });
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('{"backend":{"name":"test-repo"}}'),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
  });

  it('uses the response format when the hinted codec is not registered', async () => {
    const dispatch = vi.fn();

    await loadConfig()(dispatch);

    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'CONFIG_SUCCESS',
        payload: expect.objectContaining({ backend: { name: 'test-repo' } }),
      }),
    );
  });
});

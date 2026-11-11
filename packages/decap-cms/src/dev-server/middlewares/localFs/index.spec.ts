import { beforeEach, describe, expect, it, vi } from 'vitest';

import { move } from '@/dev-server/middlewares/utils/fs';
import { getSchema, localFsMiddleware } from '.';

import type { DevServerRequest, DevServerResponse } from '@/dev-server/app';
import type * as FsUtils from '@/dev-server/middlewares/utils/fs';
import type { ValidationResult } from '@/dev-server/middlewares/validation';

vi.mock('@/dev-server/middlewares/utils/fs', async importOriginal => ({
  ...(await importOriginal<typeof FsUtils>()),
  writeFile: vi.fn().mockResolvedValue(undefined),
  move: vi.fn(),
}));

function assetFailure(result: ValidationResult, expectedMessage: string) {
  const { error } = result;
  expect(error).not.toBeNull();
  expect(error!.details).toHaveLength(1);
  const message = error!.details.map(({ message }) => message)[0];
  expect(message).toBe(expectedMessage);
}

const defaultParams = {
  branch: 'master',
};

describe('localFsMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSchema', () => {
    it('should throw on path traversal', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });

      assetFailure(
        schema.validate({
          action: 'getEntry',
          params: { ...defaultParams, path: '../' },
        }),
        '"params.path" must resolve to a path under the configured repository, outside its .git directory',
      );
    });

    it('should not throw on valid path', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });

      const { error } = schema.validate({
        action: 'getEntry',
        params: { ...defaultParams, path: 'src/content/posts/title.md' },
      });

      expect(error).toBeUndefined();
    });

    it('should throw on folder traversal', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });

      assetFailure(
        schema.validate({
          action: 'entriesByFolder',
          params: { ...defaultParams, folder: '../', extension: 'md', depth: 1 },
        }),
        '"params.folder" must resolve to a path under the configured repository, outside its .git directory',
      );
    });

    it('should not throw on valid folder', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });

      const { error } = schema.validate({
        action: 'entriesByFolder',
        params: { ...defaultParams, folder: 'src/posts', extension: 'md', depth: 1 },
      });

      expect(error).toBeUndefined();
    });

    it('should throw on media folder traversal', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });

      assetFailure(
        schema.validate({
          action: 'getMedia',
          params: { ...defaultParams, mediaFolder: '../' },
        }),
        '"params.mediaFolder" must resolve to a path under the configured repository, outside its .git directory',
      );
    });

    it('should not throw on valid folder', () => {
      const schema = getSchema({ repoPath: '/Users/user/documents/code/repo' });
      const { error } = schema.validate({
        action: 'getMedia',
        params: { ...defaultParams, mediaFolder: 'static/images' },
      });

      expect(error).toBeUndefined();
    });
  });

  describe('persistEntry with a rename', () => {
    it('awaits the move before responding, so the response implies the rename is done', async () => {
      const order: string[] = [];
      vi.mocked(move).mockImplementation(async () => {
        order.push('move-start');
        await new Promise(resolve => setTimeout(resolve, 0));
        order.push('move-end');
      });
      const noop = () => {};
      const logger = { log: noop, info: noop, error: noop, warn: noop, debug: noop };
      const middleware = localFsMiddleware({ repoPath: '/repo', logger });
      const req = {
        body: {
          action: 'persistEntry',
          params: {
            entry: { slug: 'a', path: 'a.md', raw: 'x', newPath: 'b.md' },
            assets: [],
            options: {},
          },
        },
      } as unknown as DevServerRequest;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(() => order.push('json')),
      } as unknown as DevServerResponse;

      await middleware(req, res);

      expect(order).toEqual(['move-start', 'move-end', 'json']);
    });
  });
});

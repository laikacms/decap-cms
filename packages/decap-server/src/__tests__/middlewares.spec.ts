jest.mock('../middlewares/common', () => ({
  registerCommonMiddlewares: jest.fn(),
}));
jest.mock('../middlewares/localGit', () => ({
  registerMiddleware: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../middlewares/localFs', () => ({
  registerMiddleware: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../logger', () => ({
  createLogger: jest.fn().mockReturnValue('mock-logger'),
}));

import { registerCommonMiddlewares } from '../middlewares/common';
import { registerMiddleware as localGit } from '../middlewares/localGit';
import { registerMiddleware as localFs } from '../middlewares/localFs';
import { createLogger } from '../logger';
import { registerLocalGit, registerLocalFs } from '../middlewares';

import type express from 'express';

describe('middlewares', () => {
  const app = {} as express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOptions (via registerLocalGit/registerLocalFs)', () => {
    it('defaults logLevel to "info" when omitted', async () => {
      await registerLocalGit(app);

      expect(createLogger).toHaveBeenCalledWith({ level: 'info' });
    });

    it('passes through a custom logLevel', async () => {
      await registerLocalGit(app, { logLevel: 'debug' });

      expect(createLogger).toHaveBeenCalledWith({ level: 'debug' });
    });
  });

  describe('registerLocalGit', () => {
    it('calls registerCommonMiddlewares and the localGit registerMiddleware with the built options, in order', async () => {
      const builtOptions = { logger: 'mock-logger' };

      await registerLocalGit(app, { logLevel: 'debug' });

      expect(createLogger).toHaveBeenCalledWith({ level: 'debug' });
      expect(registerCommonMiddlewares).toHaveBeenCalledWith(app, builtOptions);
      expect(localGit).toHaveBeenCalledWith(app, builtOptions);
      expect(localFs).not.toHaveBeenCalled();

      const commonOrder = (registerCommonMiddlewares as jest.Mock).mock.invocationCallOrder[0];
      const localGitOrder = (localGit as jest.Mock).mock.invocationCallOrder[0];
      expect(commonOrder).toBeLessThan(localGitOrder);
    });
  });

  describe('registerLocalFs', () => {
    it('calls registerCommonMiddlewares and the localFs registerMiddleware with the built options, in order', async () => {
      const builtOptions = { logger: 'mock-logger' };

      await registerLocalFs(app, { logLevel: 'debug' });

      expect(createLogger).toHaveBeenCalledWith({ level: 'debug' });
      expect(registerCommonMiddlewares).toHaveBeenCalledWith(app, builtOptions);
      expect(localFs).toHaveBeenCalledWith(app, builtOptions);
      expect(localGit).not.toHaveBeenCalled();

      const commonOrder = (registerCommonMiddlewares as jest.Mock).mock.invocationCallOrder[0];
      const localFsOrder = (localFs as jest.Mock).mock.invocationCallOrder[0];
      expect(commonOrder).toBeLessThan(localFsOrder);
    });
  });
});
